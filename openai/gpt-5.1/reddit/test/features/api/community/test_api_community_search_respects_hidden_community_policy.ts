import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

export async function test_api_community_search_respects_hidden_community_policy(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to obtain admin authentication and create visibility level
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Create a visibility level to be used by the test communities
  const visibilityCode = `public-${RandomGenerator.alphabets(5)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level for E2E search tests.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user (join) and remain authenticated as member
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: "MemberPassw0rd!",
    ip: undefined,
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create two communities with same visibility level and similar names
  const sharedSearchTerm = RandomGenerator.paragraph({ sentences: 1 });

  const visibleCommunityCreateBody = {
    identifier: `visible-${RandomGenerator.alphabets(6)}`,
    title: `${sharedSearchTerm} visible`,
    description: "Visible community for search hidden policy test.",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const visibleCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: visibleCommunityCreateBody,
      },
    );
  typia.assert(visibleCommunity);

  const hiddenCommunityCreateBody = {
    identifier: `hidden-${RandomGenerator.alphabets(6)}`,
    title: `${sharedSearchTerm} hidden`,
    description: "Community that will be marked as removed/hidden.",
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const hiddenCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: hiddenCommunityCreateBody,
      },
    );
  typia.assert(hiddenCommunity);

  // 5. Switch back to platform admin by logging in again (explicit admin auth context)
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: undefined,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 6. Mark one of the communities as removed/hidden using admin update endpoint
  const hideCommunityUpdateBody = {
    is_removed: true,
  } satisfies ICommunityPlatformCommunity.IUpdate;

  const updatedHiddenCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.platformAdmin.communities.update(
      connection,
      {
        communityIdentifier: hiddenCommunity.identifier,
        body: hideCommunityUpdateBody,
      },
    );
  typia.assert(updatedHiddenCommunity);

  TestValidator.predicate(
    "hidden community is marked as removed after update",
    updatedHiddenCommunity.is_removed === true,
  );

  // 7. Perform unauthenticated public search that should match both communities by text
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const publicSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    search: sharedSearchTerm,
    includeHidden: false,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const publicSearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      publicConnection,
      {
        body: publicSearchBody,
      },
    );
  typia.assert(publicSearchResult);

  const publicIds = publicSearchResult.data.map((c) => c.id);

  TestValidator.predicate(
    "visible community appears in public search results",
    publicIds.includes(visibleCommunity.id),
  );

  TestValidator.predicate(
    "removed community does not appear in public search results",
    !publicIds.includes(hiddenCommunity.id),
  );

  // 8. Perform an admin-authenticated search with includeHidden=true to confirm access
  const adminSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    search: sharedSearchTerm,
    includeHidden: true,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const adminSearchResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.search.index(
      connection,
      {
        body: adminSearchBody,
      },
    );
  typia.assert(adminSearchResult);

  const adminIds = adminSearchResult.data.map((c) => c.id);

  TestValidator.predicate(
    "admin search sees visible community",
    adminIds.includes(visibleCommunity.id),
  );

  TestValidator.predicate(
    "admin search sees removed/hidden community when includeHidden is true",
    adminIds.includes(hiddenCommunity.id),
  );
}
