import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_post_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Authenticate as member and create a post
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  const communityCode: string = typia.random<string>();
  const postUrl: string =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode,
        body: typia.random<ICommunityPlatformPost.ICreate>(),
      },
    );
  typia.assert(postUrl);

  // Extract postCode from the returned URL
  const url = new URL(postUrl);
  const pathParts = url.pathname.split("/");
  const postCode = pathParts[pathParts.length - 1];

  // 2. Switch to moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail,
    });
  typia.assert(moderator);

  // 3. Attempt to delete the post created by member
  await TestValidator.error(
    "moderator cannot delete post created by member",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.erase(
        connection,
        {
          communityCode,
          postCode,
        },
      );
    },
  );
}
