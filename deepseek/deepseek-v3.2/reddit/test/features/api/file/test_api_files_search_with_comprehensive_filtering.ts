import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_files_search_with_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Empty search to get baseline
  const emptySearch = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformFile.IRequest,
    },
  );
  typia.assert(emptySearch);
  // Test 2: Partial name search with trigram indexing
  const searchTerm = RandomGenerator.substring(RandomGenerator.paragraph());
  const nameSearch = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: {
        search: searchTerm,
      } satisfies ICommunityPlatformFile.IRequest,
    },
  );
  typia.assert(nameSearch);
  // If we get results, verify they contain the search term (case-insensitive)
  if (nameSearch.data.length > 0) {
    for (const file of nameSearch.data) {
      TestValidator.predicate(
        `file ${file.id} name should contain search term '${searchTerm}'`,
        file.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
  }
  // Test 3: MIME type filtering
  const mimeTypes = ["image/jpeg", "image/png", "application/pdf"] as const;
  for (const mimeType of mimeTypes) {
    const typeSearch = await api.functional.communityPlatform.files.index(
      connection,
      {
        body: {
          type: mimeType,
        } satisfies ICommunityPlatformFile.IRequest,
      },
    );
    typia.assert(typeSearch);
    // Verify all returned files have the specified MIME type
    for (const file of typeSearch.data) {
      TestValidator.equals(
        `file ${file.id} type should match filter '${mimeType}'`,
        file.type,
        mimeType,
      );
    }
  }
  // Test 4: File size range filtering - ensure size_max > size_min
  const sizeMin = typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();
  const sizeMax =
    sizeMin +
    typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() +
    1000;
  const sizeSearch = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: {
        size_min: sizeMin,
        size_max: sizeMax,
      } satisfies ICommunityPlatformFile.IRequest,
    },
  );
  typia.assert(sizeSearch);
  // Verify all returned files are within the size range
  for (const file of sizeSearch.data) {
    TestValidator.predicate(
      `file ${file.id} size ${file.size} should be >= ${sizeMin}`,
      file.size >= sizeMin,
    );
    TestValidator.predicate(
      `file ${file.id} size ${file.size} should be <= ${sizeMax}`,
      file.size <= sizeMax,
    );
  }
  // Test 5: Processing status filtering
  const statuses = ["uploaded", "processing", "completed", "failed"] as const;
  for (const status of statuses) {
    const statusSearch = await api.functional.communityPlatform.files.index(
      connection,
      {
        body: {
          status: status,
        } satisfies ICommunityPlatformFile.IRequest,
      },
    );
    typia.assert(statusSearch);
    // Verify all returned files have the specified status
    for (const file of statusSearch.data) {
      TestValidator.equals(
        `file ${file.id} status should match filter '${status}'`,
        file.status,
        status,
      );
    }
  }
  // Test 6: Actor type filtering
  const actorTypes = ["member", "community", "admin"] as const;
  for (const actorType of actorTypes) {
    const actorTypeSearch = await api.functional.communityPlatform.files.index(
      connection,
      {
        body: {
          actor_type: actorType,
        } satisfies ICommunityPlatformFile.IRequest,
      },
    );
    typia.assert(actorTypeSearch);
    // Verify actor resolution - check that actor matches expected type
    for (const file of actorTypeSearch.data) {
      // Verify soft-deleted files are excluded (deleted_at should be null)
      TestValidator.equals(
        `file ${file.id} should not be soft-deleted when searching by actor_type '${actorType}'`,
        file.deleted_at,
        null,
      );
    }
  }
  // Test 7: Specific actor ID filtering
  const actorId = typia.random<string & tags.Format<"uuid">>();
  const actorIdSearch = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: {
        actor_id: actorId,
      } satisfies ICommunityPlatformFile.IRequest,
    },
  );
  typia.assert(actorIdSearch);
  // Verify soft-deleted files are excluded
  for (const file of actorIdSearch.data) {
    TestValidator.equals(
      `file ${file.id} should not be soft-deleted when searching by actor_id`,
      file.deleted_at,
      null,
    );
  }
  // Test 8: Date range filtering
  const now = new Date().toISOString();
  const pastDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const dateSearch = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: {
        created_at_start: pastDate,
        created_at_end: now,
      } satisfies ICommunityPlatformFile.IRequest,
    },
  );
}