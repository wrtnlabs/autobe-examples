import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPostKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostKarma";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_post_karma_excludes_karma_from_deleted_posts(
  connection: api.IConnection,
) {
  // Register a new member account to establish authentication context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "StrongPassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Retrieve total karma score for the authenticated member
  // This endpoint should return karma only from active (non-deleted) posts
  // Since we cannot create or delete posts (endpoints not provided),
  // we can only verify that the karma endpoint works with authenticated member
  const totalKarma: ICommunityPlatformPostKarma =
    await api.functional.communityPlatform.member.karma.post.at(connection);
  typia.assert(totalKarma);

  // Validate that total karma is a valid string with content
  TestValidator.predicate(
    "total karma is a valid string",
    typeof totalKarma === "string",
  );
  TestValidator.predicate(
    "total karma string is not empty",
    totalKarma.length > 0,
  );
}
