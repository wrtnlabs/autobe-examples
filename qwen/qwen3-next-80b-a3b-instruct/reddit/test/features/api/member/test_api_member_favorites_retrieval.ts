import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSale";
import type { ICommunityPlatformSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleFavorite";
import type { ICommunityPlatformSaleItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSaleFavorite";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_favorites_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to access protected endpoint
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
  // Step 2: Test authorized access - retrieve favorites with default pagination (empty body means default parameters)
  const favoritesResponse: IPageICommunityPlatformSaleFavorite.ISummary =
    await api.functional.communityPlatform.member.favorites.index(
      memberConnection,
      {
        body: { page: 1, limit: 10 } satisfies ICommunityPlatformSaleFavorite.IRequest,
      },
    );
  typia.assert(favoritesResponse);
  // Step 3: Validate response structure
  // Validate pagination metadata - defaults should be page=1, limit=10
  TestValidator.equals(
    "pagination current page is default",
    favoritesResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default",
    favoritesResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    favoritesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    favoritesResponse.pagination.pages >= 0,
  );
  // Validate that data array exists
  TestValidator.predicate(
    "favorites data array exists",
    Array.isArray(favoritesResponse.data),
  );
  // Step 4: Validate unauthorized access - attempt to retrieve favorites without authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.communityPlatform.member.favorites.index(
      guestConnection,
      {
        body: { page: 1, limit: 10 } satisfies ICommunityPlatformSaleFavorite.IRequest,
      },
    );
  });
}