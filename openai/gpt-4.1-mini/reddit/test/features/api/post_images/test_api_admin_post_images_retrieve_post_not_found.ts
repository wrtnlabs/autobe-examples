import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test behavior when requesting images for a post ID that does not exist.
 * After admin authentication, attempt to retrieve images for a random UUID
 * postId that is not present in the system. Validate that the system returns
 * appropriate not found error (404). Confirm error structure and message correctness.
 * Verify admin authorization is still required and enforced.
 */
export async function test_api_admin_post_images_retrieve_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // Step 2: Generate random UUID postId which is presumed non-existing
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to retrieve images for non-existing postId and expect 404
  await TestValidator.httpError(
    "retrieve images for non-existing post",
    404,
    async () => {
      await api.functional.communityPlatform.admin.posts.images.atImages(
        adminConnection,
        {
          postId: randomPostId,
        },
      );
    },
  );
}
