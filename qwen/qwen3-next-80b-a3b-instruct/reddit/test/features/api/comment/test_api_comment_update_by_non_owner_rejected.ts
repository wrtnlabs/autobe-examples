import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_comment_update_by_non_owner_rejected(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (assumed owner of existing comment)
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const owner: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: ownerEmail,
        password: "StrongPass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(owner);

  // Step 2: Create second member account (non-owner attempting update)
  const nonOwnerEmail: string = typia.random<string & tags.Format<"email">>();
  const nonOwner: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: nonOwnerEmail,
        password: "StrongPass456!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.101",
      } satisfies IMember.ICreate,
    });
  typia.assert(nonOwner);

  // Step 3: Authenticate as first user to create a post (to establish context for comment)
  const communityCode: string = "test-community-1";
  const postCode: string = "test-post-1";

  // Create a post that the comment presumably belongs to (even though we can't create the comment)
  await api.functional.communityPlatform.member.communities.posts.create(
    connection,
    {
      communityCode,
      body: "" satisfies ICommunityPlatformPost.ICreate,
    },
  );

  // Step 4: Switch to non-owner to attempt unauthorized update
  // No manual header modification: sdk will auto-update auth when using join()
  await api.functional.auth.member.join(connection, {
    body: {
      email: nonOwnerEmail,
      password: "StrongPass456!",
      href: "https://community-platform.com",
      referrer: "https://community-platform.com",
      ip: "192.168.1.101",
    } satisfies IMember.ICreate,
  });

  // Step 5: Attempt to update comment with non-owner credentials
  // Assumption: There exists a pre-seeded comment in test environment:
  //  - communityCode: "test-community-1"
  //  - postCode: "test-post-1"
  //  - commentCode: "test-comment-1"
  //  - owned by owner (first created user)
  // We test if non-owner can update it — must be rejected with 403
  await TestValidator.error(
    "non-owner update attempt should be rejected with 403 Forbidden",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.comments.update(
        connection,
        {
          communityCode,
          postCode,
          commentCode: "test-comment-1", // Assumed pre-existing comment
          body: "Updated by malicious non-owner" satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );
}
