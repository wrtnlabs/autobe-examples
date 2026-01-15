import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCartItem";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_cart_item_removal_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account using authorize utility function
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
  // Step 2: Generate random cartId and itemId in UUID format
  // Since we cannot create cart or cart items (no functions provided),
  // we generate random UUIDs to test deletion behavior
  const cartId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to delete non-existent cart item
  // The API should return 404 error for non-existent cart items
  await TestValidator.error(
    "deletion of non-existent cart item should fail with 404",
    async () => {
      await api.functional.communityPlatform.member.carts.items.erase(
        memberConnection,
        {
          cartId,
          itemId,
        },
      );
    },
  );
  // Note: We cannot test successful deletion because we cannot create cart items
  // using provided API functions. We also cannot test admin deletion because
  // no admin authorization function is provided.
  // The provided materials include only:
  // - API: api.functional.communityPlatform.member.carts.items.erase
  // - Utilities: authorize_member_join (and login/refresh)
  // - DTO: ICommunityPlatformCartItem
  //
  // We have no functions to create cart items, get carts, or login as admin.
  // This is the only possible test with the provided materials.
}
