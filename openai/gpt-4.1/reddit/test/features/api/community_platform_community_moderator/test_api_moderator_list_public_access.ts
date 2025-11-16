import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

/**
 * Validate that the public API for listing moderators of a community works as
 * expected.
 *
 * 1. Query moderator list for an existing public community using a variety of
 *    filters, sort and pagination options.
 * 2. Confirm that moderators are listed with accurate assignment statuses and
 *    correct field values.
 * 3. Check the page info and ensure it matches expectations for count and
 *    structure.
 * 4. Confirm presence and validity of all expected fields.
 * 5. Edge: Try a community with no moderators (should get empty data array with
 *    valid pagination).
 * 6. Edge: Test with more moderators than one page (iterate through pages and
 *    confirm union equals expected total).
 * 7. Edge: Test each status filter ('active', 'suspended', 'pending', 'removed')
 *    and confirm results status matches filter.
 */
export async function test_api_moderator_list_public_access(
  connection: api.IConnection,
) {
  // Prepare a random public community name
  const communityName = RandomGenerator.alphaNumeric(12);
  // 1. Test: community with no moderators
  const reqNoMods = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;
  const resultNone =
    await api.functional.communityPlatform.communities.moderators.index(
      connection,
      {
        communityName,
        body: reqNoMods,
      },
    );
  typia.assert(resultNone);
  TestValidator.equals("no moderators (empty data)", resultNone.data.length, 0);
  TestValidator.equals(
    "pagination current is 1",
    resultNone.pagination.current,
    1,
  );
  // 2. Test: Query with multiple moderators (simulate paging)
  // We'll simulate 25 mods in a random community by hitting random pages
  const moddedCommunity = RandomGenerator.alphaNumeric(12);
  const modReq: ICommunityPlatformCommunityModerator.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const modsPage1 =
    await api.functional.communityPlatform.communities.moderators.index(
      connection,
      {
        communityName: moddedCommunity,
        body: modReq,
      },
    );
  typia.assert(modsPage1);
  TestValidator.equals(
    "pagination limit is 10",
    modsPage1.pagination.limit,
    10,
  );
  if (modsPage1.pagination.records > 0) {
    // There should be mods on the first page
    TestValidator.predicate("there are moderators", modsPage1.data.length > 0);
    // Validate shape/content
    for (const moderator of modsPage1.data) {
      typia.assert(moderator);
      TestValidator.equals(
        "community ref is correct",
        moderator.community.name,
        moddedCommunity,
      );
      TestValidator.predicate(
        "moderator id is uuid",
        typeof moderator.id === "string" &&
          /^[0-9a-f\-]{36}$/.test(moderator.id),
      );
      TestValidator.predicate(
        "assignment date valid",
        typeof moderator.assigned_at === "string" &&
          moderator.assigned_at.length > 0,
      );
      TestValidator.predicate(
        "moderator record has id",
        typeof moderator.moderator.id === "string" &&
          moderator.moderator.id.length > 0,
      );
    }
    // Iterate other pages if total exceeds limit (simulate by paging)
    const totalPages = modsPage1.pagination.pages;
    if (totalPages > 1) {
      let allIds = [...modsPage1.data.map((m) => m.id)];
      for (let p = 2; p <= totalPages; ++p) {
        const pageRes =
          await api.functional.communityPlatform.communities.moderators.index(
            connection,
            {
              communityName: moddedCommunity,
              body: {
                ...modReq,
                page: p as number & tags.Type<"int32"> & tags.Minimum<1>,
              },
            },
          );
        typia.assert(pageRes);
        for (const m of pageRes.data) typia.assert(m);
        allIds.push(...pageRes.data.map((m) => m.id));
      }
      TestValidator.equals(
        "total paged mods equals records",
        allIds.length,
        modsPage1.pagination.records,
      );
    }
  } else {
    TestValidator.equals(
      "zero moderators for random moddedCommunity",
      modsPage1.data.length,
      0,
    );
  }
  // 3. Test: Filtering by assignment status
  const statuses = ["active", "suspended", "pending", "removed"] as const;
  for (const status of statuses) {
    const req = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      status,
    } satisfies ICommunityPlatformCommunityModerator.IRequest;
    const res =
      await api.functional.communityPlatform.communities.moderators.index(
        connection,
        {
          communityName: moddedCommunity,
          body: req,
        },
      );
    typia.assert(res);
    for (const mod of res.data) {
      typia.assert(mod);
      TestValidator.equals(
        `moderator status matches filter`,
        mod.status,
        status,
      );
    }
  }
  // 4. Test: Sorting by assigned_at and status in both asc/desc
  for (const order_by of ["assigned_at", "status"] as const) {
    for (const order_direction of ["asc", "desc"] as const) {
      const req = {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        order_by,
        order_direction,
      } satisfies ICommunityPlatformCommunityModerator.IRequest;
      const res =
        await api.functional.communityPlatform.communities.moderators.index(
          connection,
          {
            communityName: moddedCommunity,
            body: req,
          },
        );
      typia.assert(res);
      // Can't validate sort order without real mods, but shape must be correct
      for (const m of res.data) typia.assert(m);
    }
  }
  // 5. Test: Keyword search (simulate substring of moderator ID)
  if (modsPage1.data.length > 0) {
    const firstMod = modsPage1.data[0];
    const search = RandomGenerator.substring(firstMod.moderator.id);
    const searchReq = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      search,
    } satisfies ICommunityPlatformCommunityModerator.IRequest;
    const srchRes =
      await api.functional.communityPlatform.communities.moderators.index(
        connection,
        {
          communityName: moddedCommunity,
          body: searchReq,
        },
      );
    typia.assert(srchRes);
    // Any mod here should contain search string in moderator.id
    for (const m of srchRes.data) {
      typia.assert(m);
      TestValidator.predicate(
        "moderator id contains substring",
        m.moderator.id.includes(search),
      );
    }
  }
}
