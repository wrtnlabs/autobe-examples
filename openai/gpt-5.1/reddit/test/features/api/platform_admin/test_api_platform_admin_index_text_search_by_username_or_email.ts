import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_index_text_search_by_username_or_email(
  connection: api.IConnection,
) {
  // 1. Prepare an authenticated controlling platform admin
  const joinAdminBody = {
    username: `controller_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}+controller@example.com`,
    password: "Password123!",
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const controllerAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinAdminBody,
    },
  );
  typia.assert(controllerAdmin);

  // 2. Ensure at least one account status exists
  const statusBody = {
    key: `ACTIVE_${RandomGenerator.alphaNumeric(6)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert(createdStatus);

  // 3. Create matching and non-matching platform admins
  const searchTokenBase = "qa-search-token";
  const searchTokenSuffix = RandomGenerator.alphaNumeric(6);
  const searchToken = `${searchTokenBase}-${searchTokenSuffix}`;

  const createAdmin = async (props: {
    usernameSeed: string;
    emailLocal: string;
    displayNameSeed: string;
    includeToken: boolean;
  }): Promise<ICommunityPlatformPlatformadmin.IAuthorized> => {
    const username = props.includeToken
      ? `${props.usernameSeed}_${searchToken}`
      : `${props.usernameSeed}_${RandomGenerator.alphaNumeric(4)}`;
    const emailLocalPart = props.includeToken
      ? `${props.emailLocal}+${searchToken}`
      : `${props.emailLocal}+${RandomGenerator.alphaNumeric(4)}`;
    const email = `${emailLocalPart}@example.com`;
    const displayName = props.includeToken
      ? `${props.displayNameSeed} ${searchToken}`
      : `${props.displayNameSeed} ${RandomGenerator.name(1)}`;

    const body = {
      username,
      email,
      password: "Password123!",
      displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformPlatformadmin.IJoin;

    const admin = await api.functional.auth.platformAdmin.join(connection, {
      body,
    });
    typia.assert(admin);
    return admin;
  };

  const matchingAdmins: ICommunityPlatformPlatformadmin.IAuthorized[] = [];
  const nonMatchingAdmins: ICommunityPlatformPlatformadmin.IAuthorized[] = [];

  // Create 3 matching admins
  matchingAdmins.push(
    await createAdmin({
      usernameSeed: "match_user_1",
      emailLocal: "match1",
      displayNameSeed: "Match Admin One",
      includeToken: true,
    }),
  );
  matchingAdmins.push(
    await createAdmin({
      usernameSeed: "match_user_2",
      emailLocal: "match2",
      displayNameSeed: "Match Admin Two",
      includeToken: true,
    }),
  );
  matchingAdmins.push(
    await createAdmin({
      usernameSeed: "match_user_3",
      emailLocal: "match3",
      displayNameSeed: "Match Admin Three",
      includeToken: true,
    }),
  );

  // Create 2 non-matching admins
  nonMatchingAdmins.push(
    await createAdmin({
      usernameSeed: "plain_user_1",
      emailLocal: "plain1",
      displayNameSeed: "Plain Admin One",
      includeToken: false,
    }),
  );
  nonMatchingAdmins.push(
    await createAdmin({
      usernameSeed: "plain_user_2",
      emailLocal: "plain2",
      displayNameSeed: "Plain Admin Two",
      includeToken: false,
    }),
  );

  const expectedMatchCount = matchingAdmins.length;

  // 4. Call search endpoint with free-text search over token
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limitValue = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page,
    limit: limitValue,
    search: searchToken,
    sortBy: "createdAt",
    sortDirection: "asc",
  } satisfies ICommunityPlatformPlatformadmin.IRequest;

  const pageResult =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.index(
      connection,
      { body: requestBody },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page matches request",
    page,
    pagination.current,
  );
  TestValidator.equals(
    "pagination limit matches request",
    limitValue,
    pagination.limit,
  );
  TestValidator.equals(
    "pagination records equals expected match count",
    expectedMatchCount,
    pagination.records,
  );

  const expectedPages = Math.ceil(expectedMatchCount / limitValue);
  TestValidator.equals(
    "pagination pages derived from records and limit",
    expectedPages,
    pagination.pages,
  );

  // 6. Validate data length
  TestValidator.equals(
    "number of returned admins equals expected match count",
    expectedMatchCount,
    data.length,
  );

  // 7. Assert all returned admins contain token in username, email, or display_name
  await TestValidator.predicate(
    "all admins contain search token in some field",
    async () => {
      for (const admin of data) {
        const haystacks = [
          admin.username,
          admin.email,
          admin.display_name ?? "",
        ];
        const hasToken = haystacks.some((field) => field.includes(searchToken));
        if (!hasToken) return false;
      }
      return true;
    },
  );

  // 8. Assert that known non-matching admins are not in result set
  const nonMatchingIds = nonMatchingAdmins.map((a) => a.id);
  const resultIds = data.map((a) => a.id);

  TestValidator.predicate(
    "non-matching admin ids are not present in search results",
    nonMatchingIds.every((id) => !resultIds.includes(id)),
  );
}
