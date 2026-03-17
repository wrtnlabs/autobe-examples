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

export async function test_api_files_search_by_actor_context(
  connection: api.IConnection,
): Promise<void> {
  // Get existing files to understand data in the system
  const initialSearch = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies ICommunityPlatformFile.IRequest,
    },
  );
  typia.assert(initialSearch);
  // Test actor_type filtering
  const actorTypes = ["member", "community", "admin"] as const;
  for (const actorType of actorTypes) {
    const searchResult = await api.functional.communityPlatform.files.index(
      connection,
      {
        body: {
          actor_type: actorType,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies ICommunityPlatformFile.IRequest,
      },
    );
    typia.assert(searchResult);
    // If there are results, validate actor type matches
    if (searchResult.data.length > 0) {
      for (const file of searchResult.data) {
        // Check actor field type based on actor_type
        switch (actorType) {
          case "member":
            const memberActor = file.actor as ICommunityPlatformMember.ISummary;
            TestValidator.predicate(
              `actor should have member email for ${file.id}`,
              typeof memberActor.email === "string",
            );
            TestValidator.predicate(
              `actor should have member username for ${file.id}`,
              typeof memberActor.username === "string",
            );
            break;
          case "community":
            const communityActor =
              file.actor as ICommunityPlatformCommunity.ISummary;
            TestValidator.predicate(
              `actor should have community name for ${file.id}`,
              typeof communityActor.name === "string",
            );
            TestValidator.predicate(
              `actor should have community owner for ${file.id}`,
              communityActor.owner !== undefined,
            );
            break;
          case "admin":
            const adminActor = file.actor as ICommunityPlatformAdmin.ISummary;
            TestValidator.predicate(
              `actor should have admin email for ${file.id}`,
              typeof adminActor.email === "string",
            );
            TestValidator.predicate(
              `actor should have admin created_at for ${file.id}`,
              typeof adminActor.created_at === "string",
            );
            break;
        }
      }
    }
  }
  // Test actor_id filtering if we have any results
  if (initialSearch.data.length > 0) {
    const sampleFile = initialSearch.data[0];
    const actorId = sampleFile.actor.id;
    const actorIdSearch = await api.functional.communityPlatform.files.index(
      connection,
      {
        body: {
          actor_id: actorId,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies ICommunityPlatformFile.IRequest,
      },
    );
    typia.assert(actorIdSearch);
    // Verify all returned files belong to the specified actor
    for (const file of actorIdSearch.data) {
      TestValidator.equals(
        `file ${file.id} should belong to actor ${actorId}`,
        file.actor.id,
        actorId,
      );
    }
  }
  // Test combined filtering with concrete values
  // Use common image MIME types instead of wildcard
  const imageTypes = ["image/jpeg", "image/png", "image/gif"] as const;
  const imageType = RandomGenerator.pick(imageTypes);
  const combinedSearch = await api.functional.communityPlatform.files.index(
    connection,
    {
      body: {
        type: imageType,
        size_min: 1000 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        size_max: 10000000 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        status: "completed",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies ICommunityPlatformFile.IRequest,
    },
  );
  typia.assert(combinedSearch);
  // Validate combined filter results
  if (combinedSearch.data.length > 0) {
    for (const file of combinedSearch.data) {
      TestValidator.equals(
        `file ${file.id} should have type ${imageType}`,
        file.type,
        imageType,
      );
      TestValidator.predicate(
        `file ${file.id} size should be within range`,
        file.size >= 1000 && file.size <= 10000000,
      );
      TestValidator.equals(
        `file ${file.id} should have completed status`,
        file.status,
        "completed",
      );
    }
  }
  // Test pagination if we have enough records
  const totalRecords = initialSearch.pagination.records;
  if (totalRecords >= 3) {
    const page1 = await api.functional.communityPlatform.files.index(
      connection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformFile.IRequest,
      },
    );
    typia.assert(page1);
    const page2 = await api.functional.communityPlatform.files.index(
      connection,
      {
        body: {
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformFile.IRequest,
      },
    );
    typia.assert(page2);
    // Verify pagination metadata
    TestValidator.equals(
      "page 1 should have correct current page",
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      "page 2 should have correct current page",
      page2.pagination.current,
      2,
    );
    TestValidator.equals(
      "both pages should have same limit",
      page1.pagination.limit,
      page2.pagination.limit,
    );
    TestValidator.equals(
      "both pages should have same total records",
      page1.pagination.records,
      page2.pagination.records,
    );
  }
}
