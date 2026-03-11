import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token from authentication
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuth.token.access,
    },
  };
  // 3. Generate a pending administrator request ID
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve the administrator request
  const request = await api.functional.economicPoliticalBoard.admin.requests.at(
    adminAuthConnection,
    {
      requestId,
    },
  );
  typia.assert(request);
  // 5. Validate response fields
  TestValidator.equals("requestId matches", request.id, requestId);
  TestValidator.equals("status is pending", request.status, "pending");
  TestValidator.equals("reviewedAt is null", request.reviewed_at, null);
  TestValidator.equals("reviewNotes is null", request.review_notes, null);
  TestValidator.equals(
    "reviewedByAdmin is null",
    request.reviewedByAdmin,
    null,
  );
  TestValidator.equals("reason is present", request.reason.length > 0, true);
  TestValidator.equals(
    "userId from user object present",
    request.user.id !== undefined && request.user.id !== null,
    true,
  );
  TestValidator.equals(
    "user grade present",
    request.user.grade === "regular" || request.user.grade === "super",
    true,
  );
  TestValidator.equals(
    "createdAt is valid date-time",
    new Date(request.created_at).getTime() > 0,
    true,
  );
  TestValidator.equals(
    "updatedAt is valid date-time",
    new Date(request.updated_at).getTime() > 0,
    true,
  );
}
