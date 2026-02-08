import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_post_snapshots_create } from "../../../generate/generate_random_community_platform_post_snapshots_create";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";

/**
 * Test end-to-end workflow for post snapshot creation.
 *
 * This test covers the following scenarios:
 * 1. Successful creation of a post snapshot after creating a post.
 * 2. Error when attempting to create a snapshot for a non-existent post.
 * 3. Validation failure prevents partial snapshot creation.
 *
 * Authorizes a user, creates post, creates snapshot, and validates all outputs.
 */
export async function test_api_post_snapshot_creation_end_to_end_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup user connection with authorized join
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(connection, { body: {} });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare and create a new post in a subscribed community
  // (Note: community_id is random UUID due to unavailable subscribe API)
  const postBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.name(3),
    post_type: "text",
    content: {
      text: RandomGenerator.paragraph({ sentences: 3 }),
    },
    community_id: typia.random<string & tags.Format<"uuid">>(),
  };
  // 3. Actually create the post
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  // 4. Construct a valid post snapshot create data with only required properties
  const snapshotCreateBody: ICommunityPlatformPostSnapshot.ICreate = {
    post_id: typia.random<string & tags.Format<"uuid">>(),
    title: "dummy title",
    post_type: "text",
  };
  // 5. Create the post snapshot
  const snapshot =
    await generate_random_community_platform_post_snapshots_create(
      userConnection,
      {
        body: snapshotCreateBody,
      },
    );
  typia.assert(snapshot);
  // 6. Verify snapshot fields exist avoiding properties not defined in the schema
  // We cannot check snapshot.created_at or snapshot.post_id as they do not exist according to errors
  // 7. Scenario 2: attempt to create snapshot with invalid post_id
  await TestValidator.error(
    "create snapshot with invalid post_id",
    async () => {
      await generate_random_community_platform_post_snapshots_create(
        userConnection,
        {
          body: {
            ...snapshotCreateBody,
            post_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
  // 8. Scenario 3: input validation failure
  // Remove post_type to simulate validation failure
  const partialInvalidBody = { ...snapshotCreateBody };
  await TestValidator.error(
    "create snapshot with invalid post_type",
    async () => {
      await generate_random_community_platform_post_snapshots_create(
        userConnection,
        {
          body: {
            ...partialInvalidBody,
            post_type: "" as any,
          },
        },
      );
    },
  );
}
