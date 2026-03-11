import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

export async function test_api_admin_request_retrieve_with_nested_member_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create admin request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 3. Retrieve admin request
  const retrieved =
    await api.functional.discussionBoard.member.admin_requests.at(
      memberConnection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate core fields
  TestValidator.equals(
    "admin request id matches",
    retrieved.id,
    adminRequest.id,
  );
  TestValidator.equals("reason matches", retrieved.reason, adminRequest.reason);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.predicate(
    "submitted_at exists",
    retrieved.submitted_at !== null,
  );
  TestValidator.predicate("created_at exists", retrieved.created_at !== null);
  TestValidator.predicate("updated_at exists", retrieved.updated_at !== null);
  TestValidator.equals(
    "reviewed_at is null for pending",
    retrieved.reviewed_at,
    null,
  );
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  // 5. Validate nested member information
  TestValidator.equals("member id matches", retrieved.member.id, authResult.id);
  TestValidator.predicate(
    "member display_name exists",
    retrieved.member.display_name.length > 0,
  );
  TestValidator.equals(
    "member ban_status is active",
    retrieved.member.ban_status,
    "active",
  );
  TestValidator.predicate(
    "member created_at exists",
    retrieved.member.created_at !== null,
  );
  // 6. Validate reviewer is null for pending request
  TestValidator.equals(
    "reviewer is null for pending request",
    retrieved.reviewer,
    null,
  );
}
