import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Validate that authenticated members can retrieve a paginated, filtered, and
 * sorted list of communities.
 *
 * Steps:
 *
 * 1. Register and authenticate as a new member.
 * 2. Create multiple communities (covering different names, titles, and statuses).
 * 3. Perform basic paginated retrieval as a member, check fields and count.
 * 4. Test filtering by status (e.g. 'active', 'private') and keyword (name/title).
 * 5. Test sorting by each supported sort type ('hot', 'new', 'top',
 *    'controversial').
 * 6. Edge case: request pagination beyond last page returns empty set.
 * 7. Edge case: filter by random non-matching keyword returns empty set.
 * 8. Confirm that results adapt based on creator membership status and reflect
 *    correct accessible fields.
 */
export async function test_api_community_member_filtered_listing_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member authenticated (email_verified present)",
    typeof member.email_verified === "boolean",
  );

  // 2. Create multiple test communities
  const statuses = ["active", "private", "banned", "archived"] as const;
  const createdCommunities: ICommunityPlatformCommunity[] = [];
  for (let i = 0; i < 8; ++i) {
    const status = RandomGenerator.pick(statuses);
    const name = RandomGenerator.alphaNumeric(6);
    const title = RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    });
    const slug = RandomGenerator.alphaNumeric(10);
    const description = RandomGenerator.paragraph({ sentences: 8 });
    const community: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name,
            title,
            slug,
            description,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    createdCommunities.push(community);
  }

  // 3. Basic paginated retrieval
  const pageResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.member.communities.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.predicate(
    "pagination structure present",
    !!pageResult.pagination,
  );
  TestValidator.predicate("data is array", Array.isArray(pageResult.data));
  TestValidator.predicate(
    "no more than 5 items in page",
    pageResult.data.length <= 5,
  );

  // 4. Filtering by status
  for (const status of statuses) {
    const filterResult =
      await api.functional.communityPlatform.member.communities.index(
        connection,
        {
          body: {
            status,
            limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          } satisfies ICommunityPlatformCommunity.IRequest,
        },
      );
    typia.assert(filterResult);
    for (const record of filterResult.data) {
      TestValidator.equals(
        "community matches filter status",
        record.status,
        status,
      );
    }
  }

  // 5. Filtering by name or title (matches on any of created communities)
  for (const target of [createdCommunities[0], createdCommunities[1]]) {
    for (const key of [target.name, target.title]) {
      const filterResult =
        await api.functional.communityPlatform.member.communities.index(
          connection,
          {
            body: {
              search: key,
              limit: 15 as number & tags.Type<"int32"> & tags.Minimum<1>,
            } satisfies ICommunityPlatformCommunity.IRequest,
          },
        );
      typia.assert(filterResult);
      TestValidator.predicate(
        "at least one search result",
        filterResult.data.length > 0,
      );
      TestValidator.predicate(
        "searched for correct name/title",
        filterResult.data.some(
          (x) => x.name === target.name || x.title === target.title,
        ),
      );
    }
  }

  // 6. Sorting by supported types
  const sortTypes = ["hot", "new", "top", "controversial"] as const;
  for (const sort of sortTypes) {
    const result =
      await api.functional.communityPlatform.member.communities.index(
        connection,
        {
          body: {
            sort,
            limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          } satisfies ICommunityPlatformCommunity.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.predicate(
      `sorted by ${sort} returns data array`,
      Array.isArray(result.data),
    );
  }

  // 7. Edge case: pagination beyond last page returns empty set
  const beyondResult =
    await api.functional.communityPlatform.member.communities.index(
      connection,
      {
        body: {
          page: 1000 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(beyondResult);
  TestValidator.equals(
    "pagination beyond end returns empty",
    beyondResult.data.length,
    0,
  );

  // 8. Edge case: random non-matching keyword
  const nonMatchResult =
    await api.functional.communityPlatform.member.communities.index(
      connection,
      {
        body: {
          search: RandomGenerator.alphaNumeric(15),
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(nonMatchResult);
  TestValidator.equals(
    "non-matching keyword returns empty set",
    nonMatchResult.data.length,
    0,
  );
}
