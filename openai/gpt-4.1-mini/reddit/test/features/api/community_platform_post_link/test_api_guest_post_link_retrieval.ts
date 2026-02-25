import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_link_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving link content of a post of type 'link' as a guest user
  // 1. Authorize guest user join
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {});
  guestConnection.headers = { Authorization: guestAuth.token.access };
  // Prepare to simulate scenarios
  // Since no post creation API is provided in utilities or SDK,
  // we will test:
  // - successful retrieval with a valid UUID simulating existing link post
  // - 404 error retrieval with non-existent UUID
  // Generate a random UUID to use as a validLinkPostId
  const validLinkPostId = typia.random<string & tags.Format<"uuid">>();
  // Generate another random UUID as non-existent postId
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test retrieving link content for a valid link post
  try {
    const linkContent =
      await api.functional.communityPlatform.guest.posts.link.atLink(
        guestConnection,
        {
          postId: validLinkPostId,
        },
      );
    typia.assert(linkContent);
    TestValidator.equals(
      "postId matches",
      linkContent.community_platform_post_id,
      validLinkPostId,
    );
    TestValidator.predicate(
      "url format valid",
      /^(https?|ftp):\/\/[\w\-]+(\.[\w\-]+)+([\w\-.,@?^=%&:/~+#]*[\w\-@?^=%&/~+#])?$/.test(
        linkContent.url,
      ),
    );
    TestValidator.predicate(
      "createdAt is valid ISO date",
      !isNaN(Date.parse(linkContent.created_at)),
    );
    TestValidator.predicate(
      "updatedAt is valid ISO date",
      !isNaN(Date.parse(linkContent.updated_at)),
    );
  } catch {
    // Failed to retrieve link content, the post might not exist or not be link-type
    throw new Error("Failed to fetch valid link post content.");
  }
  // 3. Test retrieving link content for a non-existent or non-link post returns 404
  await TestValidator.httpError(
    "404 for non-existent or non-link post",
    404,
    async () => {
      await api.functional.communityPlatform.guest.posts.link.atLink(
        guestConnection,
        {
          postId: nonExistentPostId,
        },
      );
    },
  );
}
