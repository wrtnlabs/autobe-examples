import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_admin_post_unlock_after_locking_flow(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authenticated member context
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword: string = "Password123";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail as string & tags.Format<"email">,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/register" as string &
      tags.Format<"uri">,
    referrer: "https://community.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community as the member user
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a post in that community as the member user
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(createdPost);

  // Ensure the post starts unlocked
  TestValidator.predicate(
    "newly created post should initially be unlocked",
    createdPost.is_locked === false,
  );

  // Keep a snapshot of original core fields for later comparison
  const originalPostId: string & tags.Format<"uuid"> = createdPost.id;
  const originalCommunityId: string & tags.Format<"uuid"> =
    createdPost.community_id;
  const originalAuthorId: string & tags.Format<"uuid"> =
    createdPost.author_memberuser_id;
  const originalTitle: string = createdPost.title;
  const originalBody: string | null | undefined = createdPost.body ?? null;
  const originalLinkUrl: (string & tags.Format<"uri">) | null | undefined =
    createdPost.link_url ?? null;
  const originalImageUrl: (string & tags.Format<"uri">) | null | undefined =
    createdPost.image_url ?? null;
  const originalStatus: string = createdPost.status;

  // 4. Register an admin user (connection will now be authenticated as admin)
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@admin.example.com`;
  const adminPassword: string = "AdminPass123";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail as string & tags.Format<"email">,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 5. Lock the post using the admin lock endpoint
  const lockUpdateBody = {
    is_locked: true,
  } satisfies ICommunityPlatformPost.IUpdate;

  const lockedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.lock.update(
      connection,
      {
        postId: originalPostId,
        body: lockUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformPost>(lockedPost);

  TestValidator.predicate(
    "post should be locked after admin lock",
    lockedPost.is_locked === true,
  );

  // Core identity and content should remain consistent after lock
  TestValidator.equals(
    "locked post should retain original id",
    lockedPost.id,
    originalPostId,
  );
  TestValidator.equals(
    "locked post should retain original community_id",
    lockedPost.community_id,
    originalCommunityId,
  );
  TestValidator.equals(
    "locked post should retain original author_memberuser_id",
    lockedPost.author_memberuser_id,
    originalAuthorId,
  );
  TestValidator.equals(
    "locked post should retain original title",
    lockedPost.title,
    originalTitle,
  );
  TestValidator.equals(
    "locked post should retain original body",
    lockedPost.body ?? null,
    originalBody,
  );
  TestValidator.equals(
    "locked post should retain original link_url",
    lockedPost.link_url ?? null,
    originalLinkUrl,
  );
  TestValidator.equals(
    "locked post should retain original image_url",
    lockedPost.image_url ?? null,
    originalImageUrl,
  );
  TestValidator.equals(
    "locked post should retain original status",
    lockedPost.status,
    originalStatus,
  );

  // 6. Unlock the post using the admin unlock endpoint
  const unlockedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.adminUser.posts.unlock(connection, {
      postId: originalPostId,
    });
  typia.assert<ICommunityPlatformPost>(unlockedPost);

  TestValidator.predicate(
    "post should be unlocked after admin unlock",
    unlockedPost.is_locked === false,
  );

  // Verify identity and core content fields are still consistent
  TestValidator.equals(
    "unlocked post should retain original id",
    unlockedPost.id,
    originalPostId,
  );
  TestValidator.equals(
    "unlocked post should retain original community_id",
    unlockedPost.community_id,
    originalCommunityId,
  );
  TestValidator.equals(
    "unlocked post should retain original author_memberuser_id",
    unlockedPost.author_memberuser_id,
    originalAuthorId,
  );
  TestValidator.equals(
    "unlocked post should retain original title",
    unlockedPost.title,
    originalTitle,
  );
  TestValidator.equals(
    "unlocked post should retain original body",
    unlockedPost.body ?? null,
    originalBody,
  );
  TestValidator.equals(
    "unlocked post should retain original link_url",
    unlockedPost.link_url ?? null,
    originalLinkUrl,
  );
  TestValidator.equals(
    "unlocked post should retain original image_url",
    unlockedPost.image_url ?? null,
    originalImageUrl,
  );
  TestValidator.equals(
    "unlocked post should retain original status",
    unlockedPost.status,
    originalStatus,
  );

  // 7. Switch back to the member user via login to test interactions as member
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://community.example.com/post" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuthorized);

  // 8. As the member, create a comment on the unlocked post to verify interactions
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: originalPostId,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // Verify comment is attached to the correct post and looks active
  TestValidator.equals(
    "comment should be associated with the unlocked post",
    comment.post.id,
    originalPostId,
  );
  TestValidator.predicate(
    "comment should have a non-empty lifecycle status",
    typeof comment.status === "string" && comment.status.length > 0,
  );
  TestValidator.predicate(
    "comment itself should not be locked",
    comment.is_locked === false,
  );
}
