import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profiles_list_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member with username containing "alpha"
  const alphaUsername = `alpha_${RandomGenerator.alphaNumeric(8)}`;
  const alphaConnection: api.IConnection = { host: connection.host };
  const alphaMember = await authorize_member_join(alphaConnection, {
    body: {
      username: alphaUsername,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(alphaMember);
  // 2. Register second member with username containing "beta"
  const betaUsername = `beta_${RandomGenerator.alphaNumeric(8)}`;
  const betaConnection: api.IConnection = { host: connection.host };
  const betaMember = await authorize_member_join(betaConnection, {
    body: {
      username: betaUsername,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(betaMember);
  // 3. Register a few more members for sort testing
  await ArrayUtil.asyncRepeat(3, async (i) => {
    const extraConn: api.IConnection = { host: connection.host };
    await authorize_member_join(extraConn, {
      body: {
        username: `extra_sort_${i}_${RandomGenerator.alphaNumeric(8)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  });
  // 4. Update alpha member's display name to a known unique value
  const knownDisplayName = `DisplayAlpha_${RandomGenerator.alphaNumeric(6)}`;
  const updatedProfile = await api.functional.community.member.profile.update(
    alphaConnection,
    {
      body: {
        display_name: knownDisplayName,
      } satisfies ICommunityUserProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 5. Search by username keyword "alpha" (partial, lowercase)
  const searchByAlpha = await api.functional.community.userProfiles.index(
    { host: connection.host },
    {
      body: {
        search: "alpha",
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(searchByAlpha);
  // Verify alpha member appears in results
  TestValidator.predicate(
    "alpha member found by username search",
    searchByAlpha.data.some((p) => p.username === alphaUsername),
  );
  // Verify beta member does NOT appear in results
  TestValidator.predicate(
    "beta member not found in alpha search",
    !searchByAlpha.data.some((p) => p.username === betaUsername),
  );
  // 6. Case-insensitive search with "ALPHA" (uppercase)
  const searchByAlphaUpper = await api.functional.community.userProfiles.index(
    { host: connection.host },
    {
      body: {
        search: "ALPHA",
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(searchByAlphaUpper);
  TestValidator.predicate(
    "case-insensitive search finds alpha member with ALPHA keyword",
    searchByAlphaUpper.data.some((p) => p.username === alphaUsername),
  );
  // 7. Search by display name (partial match using beginning of display name)
  const displayNamePartial = knownDisplayName.substring(0, 8); // "DisplayA"
  const searchByDisplayName = await api.functional.community.userProfiles.index(
    { host: connection.host },
    {
      body: {
        search: displayNamePartial,
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(searchByDisplayName);
  TestValidator.predicate(
    "alpha member found by display name partial search",
    searchByDisplayName.data.some((p) => p.username === alphaUsername),
  );
  // 8. Sort by display_name_asc - verify alphabetical ordering (NULLS LAST)
  const sortedByDisplayNameAsc =
    await api.functional.community.userProfiles.index(
      { host: connection.host },
      {
        body: {
          sort: "display_name_asc",
          limit: 100,
        } satisfies ICommunityUserProfile.IRequest,
      },
    );
  typia.assert(sortedByDisplayNameAsc);
  // Verify display_name_asc ordering: non-null display names come before null ones (NULLS LAST)
  const displayNames = sortedByDisplayNameAsc.data.map((p) => p.display_name);
  const nonNullDisplayNames = displayNames.filter(
    (name): name is string => name !== null,
  );
  const nullCount = displayNames.filter((name) => name === null).length;
  // All non-null names should come before nulls (NULLS LAST)
  if (nonNullDisplayNames.length > 0 && nullCount > 0) {
    const lastNonNullValue =
      nonNullDisplayNames[nonNullDisplayNames.length - 1]!;
    const lastNonNullIndex = displayNames.lastIndexOf(lastNonNullValue);
    const firstNullIndex = displayNames.indexOf(null);
    TestValidator.predicate(
      "NULLS LAST: all non-null display names come before nulls",
      lastNonNullIndex < firstNullIndex,
    );
  }
  // Check non-null display names are in ascending alphabetical order
  for (let i = 0; i < nonNullDisplayNames.length - 1; i++) {
    TestValidator.predicate(
      `display_name_asc: index ${i} <= index ${i + 1}`,
      nonNullDisplayNames[i]!.localeCompare(nonNullDisplayNames[i + 1]!) <= 0,
    );
  }
  // 9. Sort by created_at_desc - verify recently registered appear first
  const sortedByCreatedAtDesc =
    await api.functional.community.userProfiles.index(
      { host: connection.host },
      {
        body: {
          sort: "created_at_desc",
          limit: 100,
        } satisfies ICommunityUserProfile.IRequest,
      },
    );
  typia.assert(sortedByCreatedAtDesc);
  // Verify descending created_at order
  for (let i = 0; i < sortedByCreatedAtDesc.data.length - 1; i++) {
    const current = new Date(
      sortedByCreatedAtDesc.data[i]!.created_at,
    ).getTime();
    const next = new Date(
      sortedByCreatedAtDesc.data[i + 1]!.created_at,
    ).getTime();
    TestValidator.predicate(
      `created_at_desc: index ${i} >= index ${i + 1}`,
      current >= next,
    );
  }
  // 10. Sort by karma_score_asc
  const sortedByKarmaAsc = await api.functional.community.userProfiles.index(
    { host: connection.host },
    {
      body: {
        sort: "karma_score_asc",
        limit: 100,
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(sortedByKarmaAsc);
  // Verify ascending karma score order
  for (let i = 0; i < sortedByKarmaAsc.data.length - 1; i++) {
    TestValidator.predicate(
      `karma_score_asc: index ${i} <= index ${i + 1}`,
      sortedByKarmaAsc.data[i]!.karma_score <=
        sortedByKarmaAsc.data[i + 1]!.karma_score,
    );
  }
  // 11. Sort with null (default - karma_score_desc)
  const sortedByDefault = await api.functional.community.userProfiles.index(
    { host: connection.host },
    {
      body: {
        sort: null,
        limit: 100,
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(sortedByDefault);
  // Verify descending karma score order (default)
  for (let i = 0; i < sortedByDefault.data.length - 1; i++) {
    TestValidator.predicate(
      `default sort (karma_score_desc): index ${i} >= index ${i + 1}`,
      sortedByDefault.data[i]!.karma_score >=
        sortedByDefault.data[i + 1]!.karma_score,
    );
  }
  // 12. No-match search
  const noMatchSearch = await api.functional.community.userProfiles.index(
    { host: connection.host },
    {
      body: {
        search: "zzznonexistent999",
      } satisfies ICommunityUserProfile.IRequest,
    },
  );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "no-match search returns empty data array",
    noMatchSearch.data.length,
    0,
  );
  TestValidator.equals(
    "no-match search returns records = 0",
    noMatchSearch.pagination.records,
    0,
  );
}
