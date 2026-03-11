import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestHistory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

export async function test_api_admin_request_history_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Login as member to get fresh session
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLogin = await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLogin);
  // 4. Create admin request as member
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberLoginConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Validate admin request was created successfully
  TestValidator.equals(
    "admin request status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "reason length is valid (50-2000 chars)",
    adminRequest.reason.length >= 50 && adminRequest.reason.length <= 2000,
  );
  // 5. Retrieve history entry using admin connection
  // Note: In a complete implementation, the admin request would be approved/rejected here
  // to generate a history entry. Since those endpoints are not available in the provided SDK,
  // we test the endpoint structure with the request ID and a generated history ID.
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const history =
    await api.functional.discussionBoard.admin.admin_requests.histories.at(
      adminConnection,
      {
        requestId: adminRequest.id,
        historyId: historyId,
      },
    );
  typia.assert(history);
  // 6. Validate business logic (typia.assert handles type validation)
  TestValidator.equals(
    "adminRequest.id matches requestId",
    history.adminRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "adminRequest.reason matches original",
    history.adminRequest.reason,
    adminRequest.reason,
  );
  TestValidator.predicate(
    "decidingAdmin.member exists",
    history.decidingAdmin.member !== undefined,
  );
  TestValidator.predicate(
    "status is valid enum value",
    ["pending", "approved", "rejected"].includes(history.status),
  );
  TestValidator.predicate(
    "reason is string or null",
    typeof history.reason === "string" || history.reason === null,
  );
}
