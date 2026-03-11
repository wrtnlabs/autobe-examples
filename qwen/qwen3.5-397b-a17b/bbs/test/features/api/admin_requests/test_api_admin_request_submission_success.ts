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

export async function test_api_admin_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Submit administrator application request with valid reason (50-2000 characters)
  const reasonText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });
  const adminRequest =
    await api.functional.discussionBoard.member.admin_requests.create(
      memberConnection,
      {
        body: {
          reason: reasonText,
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 3. Validate the created admin request
  TestValidator.equals(
    "request status should be pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "member id should match authenticated member",
    adminRequest.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "admin should be null for pending request",
    adminRequest.admin,
    null,
  );
  TestValidator.predicate(
    "submitted_at should be a valid date-time string",
    () =>
      typeof adminRequest.submitted_at === "string" &&
      adminRequest.submitted_at.length > 0,
  );
  TestValidator.predicate(
    "reason should match submitted reason",
    () => adminRequest.reason === reasonText,
  );
  TestValidator.predicate(
    "reason should be within 50-2000 characters",
    () =>
      adminRequest.reason.length >= 50 && adminRequest.reason.length <= 2000,
  );
  TestValidator.equals(
    "decided_at should be null for pending request",
    adminRequest.decided_at,
    null,
  );
  TestValidator.predicate(
    "member profile should include display_name",
    () => typeof adminRequest.member.display_name === "string",
  );
  TestValidator.equals(
    "member is_admin should be false",
    adminRequest.member.is_admin,
    false,
  );
}
