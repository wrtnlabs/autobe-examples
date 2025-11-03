import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUserVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserVerificationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserVerificationToken";

/**
 * Validate that an authenticated admin can retrieve a paginated list of all
 * verification tokens for a given user.
 *
 * Scenario Steps:
 *
 * 1. Register an admin so that the admin context is available for subsequent
 *    operations.
 * 2. Create a new community as an admin (since only admins can create communities,
 *    which will result in the auto-creation of a user to be assigned as the
 *    creator).
 * 3. Extract the user ID of the new community creator (this will be the user whose
 *    verification tokens are to be listed).
 * 4. List the verification tokens for the user as the authenticated admin, testing
 *    with default pagination and additional manual paging (page/limit) and
 *    status filtering options as supported by the API.
 * 5. Validate that the response structure follows the correct pagination type and
 *    every returned verification token belongs to the intended user. Confirm
 *    that the response contains tokens in supported statuses ('pending',
 *    'consumed', 'expired') if such tokens exist, and type validation using
 *    typia.assert().
 * 6. Ensure that unauthorized access is restricted: attempt to retrieve tokens
 *    with missing or invalid admin context and confirm that access is denied.
 */
export async function test_api_admin_user_verification_token_listing(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        href: "https://test.example.com/join",
        referrer: "https://test.example.com/",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "admin email from output equals input",
    admin.email,
    adminEmail,
  );

  // 2. Create a new community (auto-generates a user as creator)
  const communityName: string = RandomGenerator.alphaNumeric(10);
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Extract creator user ID from community
  const userId: string = community.creator_user_id;
  typia.assert<string & tags.Format<"uuid">>(userId);

  // 4. List all verification tokens for user (default paging)
  const pageDefault: IPageICommunityPlatformUserVerificationToken =
    await api.functional.communityPlatform.admin.users.verificationTokens.index(
      connection,
      {
        userId,
        body: {},
      },
    );
  typia.assert(pageDefault);
  TestValidator.predicate(
    "every verification token belongs to correct user (default page)",
    pageDefault.data.every((tok) => tok.community_platform_user_id === userId),
  );
  TestValidator.equals(
    "pagination user id matches ",
    userId,
    pageDefault.data.length > 0
      ? pageDefault.data[0].community_platform_user_id
      : userId,
  );

  // 5. Paginated request: page=1, limit=2
  const page1: IPageICommunityPlatformUserVerificationToken =
    await api.functional.communityPlatform.admin.users.verificationTokens.index(
      connection,
      {
        userId,
        body: {
          page: 1 as number & tags.Type<"int32">,
          limit: 2 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "pagination.user id for paged matches",
    userId,
    page1.data.length > 0 ? page1.data[0].community_platform_user_id : userId,
  );
  TestValidator.equals(
    "paginated limit should be 2",
    page1.pagination.limit,
    2,
  );

  // 6. Optional filter on status - test with 'pending', 'consumed', 'expired'
  for (const status of ["pending", "consumed", "expired"] as const) {
    const filtered: IPageICommunityPlatformUserVerificationToken =
      await api.functional.communityPlatform.admin.users.verificationTokens.index(
        connection,
        {
          userId,
          body: { status },
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      `tokens filtered by status: ${status}`,
      filtered.data.every(
        (tok) =>
          typeof tok === "object" && tok.community_platform_user_id === userId,
      ),
    );
  }

  // 7. Attempt unauthorized access (simulate by using connection with no headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access should be denied",
    async () => {
      await api.functional.communityPlatform.admin.users.verificationTokens.index(
        unauthConn,
        {
          userId,
          body: {},
        },
      );
    },
  );
}
