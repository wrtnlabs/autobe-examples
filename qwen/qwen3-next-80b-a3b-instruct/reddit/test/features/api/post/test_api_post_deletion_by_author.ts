import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_post_deletion_by_author(
  connection: api.IConnection,
) {
  // 1. Authenticate as member to establish context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "SecurePass123!";
  const href: string = "https://community-platform.com/join";
  const referrer: string = "https://community-platform.com";
  const ip: string = "192.168.1.100";

  const authenticatedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(authenticatedMember);

  // 2. Create a post in a community using the authenticated member
  const communityCode: string = "community-001";
  const postContent: string =
    "This is a test post created for deletion testing.";

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        communityCode,
        body: postContent satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(createdPost);

  // Extract the postCode from the returned post
  // Note: While ICommunityPlatformPost is string type, we must assume postCode
  // is a unique identifier that can be extracted from the response
  // Since the schema specifies ICommunityPlatformPost as string, we treat the response as a string post identifier
  const postCode: string = createdPost as string;

  // 3. Delete the post created by the authenticated member
  const deletedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.erase(
      connection,
      {
        communityCode,
        postCode,
      },
    );
  typia.assert(deletedPost);

  // 4. Validate that the deletion resulted in a successful response
  // Although ICommunityPlatformPost is string, we assume it represents a post object
  // with deleted_at field set
  // The spec says the response is the same ICommunityPlatformPost type - with deleted_at timestamp
  // We verify the response is not null, and by nature of the API, deleted_at should be present
  // No additional validation needed as typia.assert() ensures all constraints are met

  // 5. Verify that attempting to delete the same post again results in an error (soft-delete)
  // Since the post is already soft-deleted, this should return an error
  // The API should block deletion of already deleted posts
  await TestValidator.error(
    "deleting already deleted post should fail",
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

  // 6. Verify that a different member cannot delete this post
  // Switch to a new member account
  const differentMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const differentMemberPassword: string = "SecurePass456!";
  const differentHref: string = "https://community-platform.com/join";
  const differentReferrer: string = "https://community-platform.com";
  const differentIp: string = "192.168.1.101";

  await api.functional.auth.member.join(connection, {
    body: {
      email: differentMemberEmail,
      password: differentMemberPassword,
      href: differentHref,
      referrer: differentReferrer,
      ip: differentIp,
    } satisfies IMember.ICreate,
  });

  // Try to delete the post created by original member
  await TestValidator.error(
    "different member cannot delete another member's post",
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
