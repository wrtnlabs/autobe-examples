import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_post_status_update_to_published(
  connection: api.IConnection,
) {
  // Step 1: Establish authenticated member context by joining
  const email: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password: "SecureP@ssw0rd123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com/home",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a new post with draft status
  const communityCode = typia.random<string>();
  const createData = JSON.stringify({
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    status: "draft",
    tags: [RandomGenerator.name(1), RandomGenerator.name(1)],
  });
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode,
        body: createData satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // Step 3: Update the post status from 'draft' to 'published'
  const updateData = JSON.stringify({
    status: "published",
  });
  const updateResult: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.update(
      connection,
      {
        communityCode,
        postCode: post, // post is a string (the post code)
        body: updateData satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updateResult);

  // Step 4: Verify that the update operation returned the same post code
  // This confirms the update succeeded and the post identifier is consistent
  TestValidator.equals(
    "update operation should return the same post code as creation",
    updateResult,
    post,
  );
}
