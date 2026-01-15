import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleFavorite";
import { prepare_random_community_platform_sale_favorite } from "../../../prepare/prepare_random_community_platform_sale_favorite";
import { generate_random_community_platform_member_favorites_create } from "../../../generate/generate_random_community_platform_member_favorites_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_favorite_removal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create a favorite item using the authenticated member connection
  const productId = typia.random<string & tags.Format<"uuid">>();
  const favorite =
    await generate_random_community_platform_member_favorites_create(
      memberConnection,
      {
        body: {
          productId: productId,
        } satisfies ICommunityPlatformSaleFavorite.ICreate,
      },
    );
  typia.assert(favorite);
  // Step 3: Delete the favorite item using the productId as the favoriteId
  // API design: favoriteId parameter for deletion uses the productId since favorite entries are per-product
  await api.functional.communityPlatform.member.favorites.erase(
    memberConnection,
    {
      favoriteId: productId, // Using productId as favoriteId per API contract
    },
  );
  // Step 4: Verify the favorite item is permanently removed by attempting to delete it again
  // Since the same productId will always create/delete the same favorite entry,
  // trying to delete again after successful deletion should return 404 Not Found
  await TestValidator.error(
    "deleting an already-deleted favorite should return 404 Not Found",
    async () => {
      await api.functional.communityPlatform.member.favorites.erase(
        memberConnection,
        {
          favoriteId: productId,
        },
      );
    },
  );
}
