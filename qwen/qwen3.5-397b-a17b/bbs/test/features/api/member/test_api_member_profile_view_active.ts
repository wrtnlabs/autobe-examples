import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_member_profile_view_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authorized);
  // 2. View the member's public profile (accessible to guests without authentication)
  const profile = await api.functional.discussionBoard.members.at(connection, {
    memberId: authorized.id,
  });
  typia.assert(profile);
  // 3. Validate profile structure and content
  TestValidator.equals("member ID matches", profile.id, authorized.id);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.equals("bio matches", profile.bio, authorized.bio);
  TestValidator.equals("status is active", profile.status, "active");
  TestValidator.predicate(
    "articles count is non-negative integer",
    profile.articles_count >= 0,
  );
  TestValidator.predicate(
    "comments count is non-negative integer",
    profile.comments_count >= 0,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
