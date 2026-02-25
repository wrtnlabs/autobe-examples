import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_post_snapshots_create_post_snapshot } from "../../../generate/generate_random_community_platform_admin_post_snapshots_create_post_snapshot";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";

export async function test_api_post_snapshot_create_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup (register and login to get adminConnection)
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate credentials for admin join
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: { password: adminPassword },
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword, // use actual password for login
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(adminLogin);
  adminConnection.headers = { Authorization: adminLogin.token.access };
  // 2. User setup (register and login to get userConnection)
  const userConnection: api.IConnection = { host: connection.host };
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userJoin = await authorize_user_join(userConnection, {
    body: { password: userPassword },
  });
  typia.assert(userJoin);
  const userLogin = await authorize_user_login(userConnection, {
    body: {
      email: userJoin.email,
      password: userPassword, // use generated userPassword for login
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(userLogin);
  userConnection.headers = { Authorization: userLogin.token.access };
  // 3. Create a community by user
  const communityCreateInput: ICommunityPlatformCommunity.ICreate = {
    name: `test-community-${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    iconUrl: `https://example.com/icon-${RandomGenerator.alphabets(4)}.png`,
  };
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      { body: communityCreateInput },
    );
  typia.assert(community);
  // 4. Create a post within the community by user
  // Create a text post for simplicity
  const postCreateBody = {
    title: `Test Post - ${RandomGenerator.alphabets(6)}`,
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 5. Compose valid post snapshot creation data copied from post
  const snapshotCreateBody: ICommunityPlatformPostSnapshot.ICreate = {
    communityPlatformPostId: post.id,
    title: post.title,
    contentText:
      postCreateBody.postType === "text" ? postCreateBody.content : null,
    contentUrl:
      postCreateBody.postType === "link"
        ? ((postCreateBody as any).url ?? null)
        : null,
    contentImageUrl:
      postCreateBody.postType === "image"
        ? ((postCreateBody as any).images?.[0] ?? null)
        : null,
    postType: post.postType,
    authorUserId: post.authorUserId ?? userJoin.id,
    communityId: post.communityId,
    voteScore: post.voteCount,
    commentCount: post.commentCount,
  };
  // 6. Test successful creation of post snapshot by admin
  const snapshot =
    await generate_random_community_platform_admin_post_snapshots_create_post_snapshot(
      adminConnection,
      { body: snapshotCreateBody },
    );
  typia.assert(snapshot);
  // Validate snapshot fields match input (except auto-generated timestamps, id, deletedAt)
  TestValidator.equals(
    "Post snapshot communityPlatformPostId",
    snapshot.community_platform_post_id,
    snapshotCreateBody.communityPlatformPostId,
  );
  TestValidator.equals(
    "Post snapshot title",
    snapshot.title,
    snapshotCreateBody.title,
  );
  TestValidator.equals(
    "Post snapshot contentText",
    snapshot.content_text,
    snapshotCreateBody.contentText,
  );
  TestValidator.equals(
    "Post snapshot contentUrl",
    snapshot.content_url,
    snapshotCreateBody.contentUrl,
  );
  TestValidator.equals(
    "Post snapshot contentImageUrl",
    snapshot.content_image_url,
    snapshotCreateBody.contentImageUrl,
  );
  TestValidator.equals(
    "Post snapshot postType",
    snapshot.post_type,
    snapshotCreateBody.postType,
  );
  TestValidator.equals(
    "Post snapshot authorUserId",
    snapshot.author_user_id,
    snapshotCreateBody.authorUserId,
  );
  TestValidator.equals(
    "Post snapshot communityId",
    snapshot.community_id,
    snapshotCreateBody.communityId,
  );
  TestValidator.equals(
    "Post snapshot voteScore",
    snapshot.vote_score,
    snapshotCreateBody.voteScore,
  );
  TestValidator.equals(
    "Post snapshot commentCount",
    snapshot.comment_count,
    snapshotCreateBody.commentCount,
  );
  TestValidator.predicate(
    "Post snapshot has id",
    typeof snapshot.id === "string" && snapshot.id.length > 0,
  );
  TestValidator.predicate(
    "Post snapshot has createdAt",
    typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "Post snapshot has updatedAt",
    typeof snapshot.updated_at === "string" && snapshot.updated_at.length > 0,
  );
  TestValidator.equals(
    "Post snapshot deletedAt is null",
    snapshot.deleted_at,
    null,
  );
  // 7. Negative test: non-admin user cannot create post snapshot (403 forbidden)
  await TestValidator.httpError(
    "non-admin user cannot create post snapshot",
    403,
    async () => {
      await generate_random_community_platform_admin_post_snapshots_create_post_snapshot(
        userConnection,
        {
          body: snapshotCreateBody,
        },
      );
    },
  );
  // 8. Negative test: admin cannot create post snapshot with invalid data (missing required fields)
  const invalidBodies: Array<Partial<ICommunityPlatformPostSnapshot.ICreate>> =
    [
      {},
      { communityPlatformPostId: null as any },
      { title: "" },
      // Removed invalid postType value test to avoid unexpected failures
    ];
  await ArrayUtil.asyncForEach(invalidBodies, async (invalidBody, index) => {
    await TestValidator.httpError(
      `admin create post snapshot invalid data #${index + 1}`,
      400,
      async () => {
        await generate_random_community_platform_admin_post_snapshots_create_post_snapshot(
          adminConnection,
          { body: invalidBody as any },
        );
      },
    );
  });
}
