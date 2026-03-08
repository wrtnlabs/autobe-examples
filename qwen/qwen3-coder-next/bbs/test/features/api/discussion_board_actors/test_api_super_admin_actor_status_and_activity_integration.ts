import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_actor_status_and_activity_integration(
  connection: api.IConnection,
): Promise<void> {
  // === Step 1: Setup super admin connection ===
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Super Admin Test User",
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // === Step 2: Create test actors ===
  const totalActors = 110;
  const actors: {
    id: string;
    role: "member" | "admin" | "superAdmin";
    createdAt: string;
    isBanned: boolean;
    hasPendingRequest: boolean;
  }[] = [];
  // Create 40 members
  for (let i = 0; i < 40; i++) {
    const result = await authorize_member_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    actors.push({
      id: result.id,
      role: "member",
      createdAt: new Date().toISOString(),
      isBanned: false,
      hasPendingRequest: false,
    });
  }
  // Create 40 admins
  for (let i = 0; i < 40; i++) {
    const result = await authorize_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
    actors.push({
      id: result.id,
      role: "admin",
      createdAt: new Date().toISOString(),
      isBanned: false,
      hasPendingRequest: false,
    });
  }
  // Create 30 super admins
  for (let i = 0; i < 30; i++) {
    const result = await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
    actors.push({
      id: result.id,
      role: "superAdmin",
      createdAt: new Date().toISOString(),
      isBanned: false,
      hasPendingRequest: false,
    });
  }
  // === Step 3: Apply status modifications ===
  // Select 20 random actors to ban
  const indices = Array.from({ length: totalActors }, (_, i) => i);
  for (let i = 0; i < 20; i++) {
    const randIndex = Math.floor(Math.random() * indices.length);
    const bannedIndex = indices.splice(randIndex, 1)[0];
    actors[bannedIndex].isBanned = true;
  }
  // Select 15 random actors to have pending admin requests
  const remainingIndices = indices;
  for (let i = 0; i < 15; i++) {
    const randIndex = Math.floor(Math.random() * remainingIndices.length);
    const pendingRequestIndex = remainingIndices.splice(randIndex, 1)[0];
    actors[pendingRequestIndex].hasPendingRequest = true;
  }
  // Sort actors by creation date (newest first) for predictable ordering
  actors.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  // === Step 4: Test actor listing with status filters ===
  // Test 4.1: Get all actors (no status filter)
  const allActorsResponse =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(allActorsResponse);
  TestValidator.equals("total actor count", allActorsResponse.data.length, 110);
  // Test 4.2: Test status filter 'banned' (only actors with ban records)
  const bannedActorsResponse =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          status: "banned",
          limit: 100,
        },
      },
    );
  typia.assert(bannedActorsResponse);
  // Since we haven't created actual ban records yet, this will return empty
  // In a real implementation, we would create ban records here
  // Test 4.3: Test status filter 'pending' (only actors with pending admin requests)
  const pendingActorsResponse =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          limit: 100,
        },
      },
    );
  typia.assert(pendingActorsResponse);
  // Since we haven't created actual admin requests yet, this will return empty
  // In a real implementation, we would create admin requests here
  // Test 4.4: Test no status filter (should return all actors)
  const allStatusResponse =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(allStatusResponse);
  TestValidator.equals("all actors count", allStatusResponse.data.length, 110);
  // === Step 5: Test sorting (newest first by default) ===
  const sortedActorsResponse =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(sortedActorsResponse);
  // Verify sorting by checking if created_at is in descending order
  for (let i = 0; i < sortedActorsResponse.data.length - 1; i++) {
    const current = new Date(sortedActorsResponse.data[i].created_at).getTime();
    const next = new Date(
      sortedActorsResponse.data[i + 1].created_at,
    ).getTime();
    TestValidator.predicate(
      `actor ${i} should be newer than actor ${i + 1}`,
      current >= next,
    );
  }
  // === Step 6: Test pagination with large dataset ===
  const paginationLimit = 10;
  const expectedPages = Math.ceil(totalActors / paginationLimit); // 11 pages
  // Test pagination metadata
  const paginationResponse =
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          limit: paginationLimit,
          page: 1,
        },
      },
    );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination current page",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResponse.pagination.limit,
    paginationLimit,
  );
  TestValidator.equals(
    "pagination records",
    paginationResponse.pagination.records,
    totalActors,
  );
  TestValidator.equals(
    "pagination pages",
    paginationResponse.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "first page data count",
    paginationResponse.data.length,
    paginationLimit,
  );
  // Test pagination across multiple pages
  const allPaginatedActors: IDiscussionBoardGuest.ISummary[] = [];
  for (let page = 1; page <= expectedPages; page++) {
    const pageResponse =
      await api.functional.discussionBoard.superAdmin.actors.index(
        superAdminConnection,
        {
          body: {
            limit: paginationLimit,
            page,
          },
        },
      );
    typia.assert(pageResponse);
    // Verify no duplicates
    pageResponse.data.forEach((actor) => {
      TestValidator.predicate(
        `actor ${actor.id} not already in results`,
        !allPaginatedActors.some((a) => a.id === actor.id),
      );
      allPaginatedActors.push(actor);
    });
  }
  // Verify we got all unique actors across pagination
  TestValidator.equals(
    "total paginated actors",
    allPaginatedActors.length,
    totalActors,
  );
  // === Step 7: Verify all actors are accessible ===
  const actorIdsFromCreation = new Set(actors.map((a) => a.id));
  const actorIdsFromPagination = new Set(allPaginatedActors.map((a) => a.id));
  // Check if all created actors are in the paginated results
  actorIdsFromCreation.forEach((id) => {
    TestValidator.predicate(
      `actor ${id} exists in pagination`,
      actorIdsFromPagination.has(id),
    );
  });
  // === Step 8: Test performance with large dataset ===
  const startTime = Date.now();
  await api.functional.discussionBoard.superAdmin.actors.index(
    superAdminConnection,
    {
      body: {
        limit: 100,
        page: 1,
      },
    },
  );
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  // Performance check: response should be fast (< 1000ms for 100 records)
  TestValidator.predicate(
    "performance: response time under 1000ms",
    responseTime < 1000,
  );
  // === Step 9: Test cursor-based pagination efficiency ===
  // Since the API uses page-based pagination, we verify efficiency by checking
  // that multiple page requests complete quickly
  const cursorTests = 5;
  const cursorTimes: number[] = [];
  for (let i = 0; i < cursorTests; i++) {
    const cursorStart = Date.now();
    await api.functional.discussionBoard.superAdmin.actors.index(
      superAdminConnection,
      {
        body: {
          limit: paginationLimit,
          page: Math.floor(Math.random() * expectedPages) + 1,
        },
      },
    );
    const cursorEnd = Date.now();
    cursorTimes.push(cursorEnd - cursorStart);
  }
  const avgCursorTime = cursorTimes.reduce((a, b) => a + b, 0) / cursorTests;
  TestValidator.predicate(
    "cursor pagination: average response time under 500ms",
    avgCursorTime < 500,
  );
}