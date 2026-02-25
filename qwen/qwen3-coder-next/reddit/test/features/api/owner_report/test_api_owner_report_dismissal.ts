import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentReport";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_report_dismissal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials: IRedditCloneOwner.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphabets(8),
    displayName: RandomGenerator.name(),
  };
  const ownerAuthorized: IRedditCloneOwner.IAuthorized =
    await authorize_owner_join(ownerConnection, { body: ownerCredentials });
  typia.assert(ownerAuthorized);
  // 2. Test report listing functionality with filtering
  const pendingReports =
    await api.functional.redditClone.owner.communities.reports.index(
      ownerConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "pending",
          limit: 10,
        } satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination structure is valid",
    typeof pendingReports.pagination.current,
    "number",
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(pendingReports.data),
    true,
  );
  // 4. Test dismissed reports filtering
  const dismissedReports =
    await api.functional.redditClone.owner.communities.reports.index(
      ownerConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "dismissed",
          limit: 10,
        } satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(dismissedReports);
  // 5. Validate dismissed reports structure
  TestValidator.predicate(
    "dismissed reports have correct structure",
    dismissedReports.data.every((report) => {
      typia.assert(report);
      return true;
    }),
  );
}
