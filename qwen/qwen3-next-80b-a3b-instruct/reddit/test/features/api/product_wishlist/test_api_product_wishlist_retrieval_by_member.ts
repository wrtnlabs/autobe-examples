import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProductWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductWishlist";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_product_wishlist_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to establish ownership context
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Authenticate another member to test ownership enforcement
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(otherMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(otherMember);
  // Step 3: Generate a random wishlist ID that might exist and belong to member1 (assuming system has pre-existing wishlists)
  // This ID is assumed to be a real wishlist owned by member1 (from prior setup)
  const existingWishlistId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 4: Test that retrieving a non-existent wishlist returns 404 Not Found
  await TestValidator.error(
    "retrieving non-existent wishlist should return 404 Not Found",
    async () => {
      await api.functional.communityPlatform.member.productwishlists.at(
        memberConnection,
        {
          wishlistId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
  // Step 5: Test that attempting to access another member's wishlist returns 403 Forbidden
  await TestValidator.error(
    "accessing another member's wishlist should return 403 Forbidden",
    async () => {
      await api.functional.communityPlatform.member.productwishlists.at(
        otherMemberConnection,
        {
          wishlistId: existingWishlistId,
        },
      );
    },
  );
}
