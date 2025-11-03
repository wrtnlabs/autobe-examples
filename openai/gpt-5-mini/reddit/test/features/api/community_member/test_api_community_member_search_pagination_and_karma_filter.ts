import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunityMember";

/**
 * Validate pagination and karma-range filtering of community members directory.
 *
 * Business purpose:
 *
 * - Ensure that the directory endpoint correctly filters members by karma range,
 *   respects sorting by karma, and paginates results without duplication.
 *
 * Steps:
 *
 * 1. Create several community members via POST /auth/communityMember/join.
 * 2. Observe returned member summaries (includes karma) and construct a karma
 *    range that will include a subset of created members.
 * 3. Call PATCH /communityBbs/communityMembers with the karma range, limit and
 *    sort_by=karma order=desc for page 0 and page 1.
 * 4. Assert type safety and business rules using typia.assert and TestValidator.
 */
export async function test_api_community_member_search_pagination_and_karma_filter(
  connection: api.IConnection,
) {
  // 0. Config
  const created: ICommunityBbsCommunityMember.ISummary[] = [];
  const totalToCreate = 7;

  // 1. Create multiple members via public join endpoint and collect their summaries
  for (let i = 0; i < totalToCreate; ++i) {
    const username = `u${RandomGenerator.alphaNumeric(5)}`; // 6 chars max, valid pattern
    const email = `${username}@example.test`;

    const body = {
      email,
      username,
      password: "Passw0rd!",
      display_name: RandomGenerator.name(),
      session_context: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate;

    const authorized: ICommunityBbsCommunityMember.IAuthorized =
      await api.functional.auth.communityMember.join(connection, {
        body,
      });
    typia.assert(authorized);
    // authorized.member is the created member summary
    created.push(authorized.member);
  }

  // Ensure we have at least one created member
  TestValidator.predicate(
    "created at least one community member",
    created.length > 0,
  );

  // 2. Build karma range from observed karmas to include an internal subset
  const karmas = created.map((m) => m.karma).sort((a, b) => a - b);
  // Defensive selection: pick inner range (exclude min and max if possible)
  const karmaMin = karmas.length >= 3 ? karmas[1] : karmas[0];
  const karmaMax =
    karmas.length >= 3 ? karmas[karmas.length - 2] : karmas[karmas.length - 1];

  // Compute expected matching member ids based on observed karmas
  const expectedMatchingIds = created
    .filter((m) => m.karma >= karmaMin && m.karma <= karmaMax)
    .map((m) => m.id);

  // 3. Request page 0 with small limit to exercise pagination
  const limit = 3;
  const requestPage0 = {
    page: 0,
    limit,
    karma_min: karmaMin,
    karma_max: karmaMax,
    sort_by: "karma",
    order: "desc",
  } satisfies ICommunityBbsCommunityMember.IRequest;

  const page0: IPageICommunityBbsCommunityMember.ISummary =
    await api.functional.communityBbs.communityMembers.index(connection, {
      body: requestPage0,
    });
  typia.assert(page0);

  // Business validations on page0
  TestValidator.predicate(
    "page0: number of returned records does not exceed requested limit",
    page0.data.length <= limit,
  );

  TestValidator.predicate(
    "page0: all returned karmas within requested karma range",
    page0.data.every((d) => d.karma >= karmaMin && d.karma <= karmaMax),
  );

  // Ordering (karma desc)
  for (let i = 1; i < page0.data.length; ++i) {
    TestValidator.predicate(
      `page0: karma order desc at index ${i - 1} >= ${i}`,
      page0.data[i - 1].karma >= page0.data[i].karma,
    );
  }

  // 4. Request page 1 and validate no duplicates and coverage
  const requestPage1 = {
    page: 1,
    limit,
    karma_min: karmaMin,
    karma_max: karmaMax,
    sort_by: "karma",
    order: "desc",
  } satisfies ICommunityBbsCommunityMember.IRequest;

  const page1: IPageICommunityBbsCommunityMember.ISummary =
    await api.functional.communityBbs.communityMembers.index(connection, {
      body: requestPage1,
    });
  typia.assert(page1);

  // No duplicate ids across pages
  const idsPage0 = page0.data.map((d) => d.id);
  const idsPage1 = page1.data.map((d) => d.id);
  const combined = [...idsPage0, ...idsPage1];
  const uniqueCount = new Set(combined).size;

  TestValidator.predicate(
    "no duplicate member ids across page0 and page1",
    uniqueCount === combined.length,
  );

  // All returned ids must belong to expectedMatchingIds (i.e., the observed subset)
  TestValidator.predicate(
    "all returned ids are part of the expected matching set",
    combined.every((id) => expectedMatchingIds.includes(id)),
  );

  // Pagination metadata sanity checks
  TestValidator.predicate(
    "pagination: current page is 0 for first request",
    page0.pagination.current === 0,
  );
  TestValidator.predicate(
    "pagination: limit respects requested upper bound",
    page0.pagination.limit <= limit,
  );

  // Final sanity: total records reported should be >= returned count
  TestValidator.predicate(
    "pagination: records >= returned records",
    page0.pagination.records >= page0.data.length,
  );
}
