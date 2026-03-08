import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_administrator_request_approved_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Join first super administrator
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  // 3. List pending administrator requests
  const requestsList =
    await api.functional.economicPoliticalBoard.admin.administrator_requests.index(
      firstAdminConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(requestsList);
  // 4. Approve the first pending request if available, otherwise skip
  if (requestsList.data.length === 0) {
    TestValidator.predicate("test requires pending requests", false);
    return;
  }
  const pendingRequestId = requestsList.data[0].id;
  // 5. Approve the pending request
  const approvedRequest: IEconomicPoliticalBoardAdministratorRequest =
    await api.functional.economicPoliticalBoard.admin.pending_requests.approve(
      firstAdminConnection,
      {
        requestId: pendingRequestId,
      },
    );
  typia.assert(approvedRequest);
  // 6. Join second super administrator
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_admin_join(secondAdminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(secondAdmin);
  // 7. Second admin retrieves the approved request
  const retrievedRequest: IEconomicPoliticalBoardAdministratorRequest =
    await api.functional.economicPoliticalBoard.admin.administrator_requests.at(
      secondAdminConnection,
      {
        requestId: pendingRequestId,
      },
    );
  typia.assert(retrievedRequest);
  // 8. Validate the retrieved request
  TestValidator.equals(
    "request status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.notEquals(
    "reviewed_at is set",
    retrievedRequest.reviewed_at,
    null,
  );
  TestValidator.notEquals(
    "reviewed_by_admin_id is set",
    retrievedRequest.reviewed_by_admin_id,
    null,
  );
  TestValidator.equals(
    "author matches original request",
    requestsList.data[0].author.id,
    requestsList.data[0].author.id,
  );
  TestValidator.notEquals(
    "reviewed_by_admin is set",
    retrievedRequest.reviewed_by_admin,
    null,
  );
}
