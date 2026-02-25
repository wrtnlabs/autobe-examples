import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_communities_popular_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Test subscriber_count sorting (default/popular)
  const subscriberSort =
    await api.functional.communityPlatform.communities.popular.index(
      connection,
      {
        body: {
          sort: "subscriber_count" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<10>
          >() satisfies number,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(subscriberSort);
  // Test created_at sorting (recency)
  const createdSort =
    await api.functional.communityPlatform.communities.popular.index(
      connection,
      {
        body: {
          sort: "created_at" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<10>
          >() satisfies number,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(createdSort);
  // Test name sorting (alphabetical)
  const nameSort =
    await api.functional.communityPlatform.communities.popular.index(
      connection,
      {
        body: {
          sort: "name" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<10>
          >() satisfies number,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(nameSort);
  // Validate subscriber_count sorting order (should be descending)
  if (subscriberSort.data.length > 1) {
    for (let i = 0; i < subscriberSort.data.length - 1; i++) {
      // Since we cannot verify subscriber counts without statistics DTO,
      // we can only validate that the API returns valid data structure
      TestValidator.predicate(
        `community ${i} has valid structure`,
        subscriberSort.data[i] !== null &&
          typeof subscriberSort.data[i].id === "string",
      );
    }
  }
  // Validate created_at sorting order (should be descending - newer first)
  if (createdSort.data.length > 1) {
    for (let i = 0; i < createdSort.data.length - 1; i++) {
      const current = new Date(createdSort.data[i].created_at);
      const next = new Date(createdSort.data[i + 1].created_at);
      TestValidator.predicate(
        `created_at order: community ${i} is newer or equal to ${i + 1}`,
        current >= next,
      );
    }
  }
  // Validate name sorting order (should be alphabetical ascending)
  if (nameSort.data.length > 1) {
    for (let i = 0; i < nameSort.data.length - 1; i++) {
      const currentName = nameSort.data[i].name.toLowerCase();
      const nextName = nameSort.data[i + 1].name.toLowerCase();
      TestValidator.predicate(
        `name order: '${nameSort.data[i].name}' <= '${nameSort.data[i + 1].name}'`,
        currentName <= nextName,
      );
    }
  }
  // Test that different sort parameters produce different ordering (when data exists)
  if (subscriberSort.data.length > 0 && nameSort.data.length > 0) {
    TestValidator.notEquals(
      "subscriber_count and name sorting should produce different order when data exists",
      subscriberSort.data.map((c) => c.id),
      nameSort.data.map((c) => c.id),
    );
  }
}
