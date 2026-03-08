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
  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create admin request connection with the member's token
  const adminRequestConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Submit administrator privilege request with valid reason
  const adminRequest: IDiscussionBoardAdminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      adminRequestConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 4. Validate the response structure and business logic
  TestValidator.predicate(
    "status is pending",
    adminRequest.status === "pending",
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminRequest.id,
    ),
  );
  TestValidator.predicate(
    "has submitted_at timestamp",
    adminRequest.submitted_at !== null,
  );
  TestValidator.predicate(
    "reviewed_at is null for pending",
    adminRequest.reviewed_at === null,
  );
  TestValidator.predicate(
    "has author information",
    adminRequest.author !== null,
  );
  TestValidator.predicate(
    "author has valid ID",
    adminRequest.author.id !== null,
  );
  TestValidator.predicate(
    "author has display name",
    adminRequest.author.displayName !== null,
  );
  TestValidator.equals(
    "reason matches input",
    adminRequest.reason,
    RandomGenerator.paragraph({ sentences: 5 }),
  );
}
