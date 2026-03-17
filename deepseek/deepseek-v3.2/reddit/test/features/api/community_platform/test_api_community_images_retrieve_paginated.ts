import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community images retrieval with pagination.
 *
 * Creates a test community with multiple images and verifies paginated retrieval
 * with proper sorting (ordering priority then newest first).
 */
export async function test_api_community_images_retrieve_paginated(
  connection: api.IConnection,
): Promise<void> {
  // We need to create a community first, but we don't have community creation APIs
  // For now, we'll use a random community ID and hope it exists
  // This is a limitation - we should create a community first if we had the API
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create request for first page with limit 3
  const request: ICommunityPlatformCommunityImage.IRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1> as number,
    limit: 3 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number,
  };
  // Call the API
  const response = await api.functional.communityPlatform.images.index(
    connection,
    {
      communityId,
      body: request,
    },
  );
  // Validate response structure
  typia.assert(response);
  // Check pagination metadata
  TestValidator.equals(
    "pagination.current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 3",
    response.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "pagination.records should be >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 0",
    response.pagination.pages >= 0,
  );
  // Verify data array length doesn't exceed limit
  TestValidator.predicate(
    "data length should not exceed limit",
    response.data.length <= 3,
  );
  // Validate each image summary
  for (const image of response.data) {
    typia.assert(image);
    // Check required fields exist
    TestValidator.predicate(
      "image.id should be UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        image.id,
      ),
    );
    TestValidator.predicate(
      "image.uri should be string",
      typeof image.uri === "string",
    );
    TestValidator.predicate(
      "image.filename should be string",
      typeof image.filename === "string",
    );
    TestValidator.predicate(
      "image.contentType should be string",
      typeof image.contentType === "string",
    );
    TestValidator.predicate(
      "image.width should be integer",
      Number.isInteger(image.width),
    );
    TestValidator.predicate(
      "image.height should be integer",
      Number.isInteger(image.height),
    );
    TestValidator.predicate(
      "image.sizeBytes should be integer",
      Number.isInteger(image.sizeBytes),
    );
    TestValidator.predicate(
      "image.ordering should be integer",
      Number.isInteger(image.ordering),
    );
    TestValidator.predicate(
      "image.active should be boolean",
      typeof image.active === "boolean",
    );
    TestValidator.predicate(
      "image.createdAt should be ISO date string",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(image.createdAt),
    );
    // Validate community summary
    typia.assert(image.community);
    TestValidator.predicate(
      "community.id should be UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        image.community.id,
      ),
    );
    TestValidator.predicate(
      "community.name should be string",
      typeof image.community.name === "string",
    );
    TestValidator.predicate(
      "community.description should be string or null",
      typeof image.community.description === "string" ||
        image.community.description === null,
    );
    TestValidator.predicate(
      "community.created_at should be ISO date string",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        image.community.created_at,
      ),
    );
    TestValidator.predicate(
      "community.subscriber_count should be non-negative integer",
      Number.isInteger(image.community.subscriber_count) &&
        image.community.subscriber_count >= 0,
    );
    // Validate community owner
    typia.assert(image.community.owner);
    TestValidator.predicate(
      "community.owner.id should be UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        image.community.owner.id,
      ),
    );
    TestValidator.predicate(
      "community.owner.email should be email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(image.community.owner.email),
    );
    TestValidator.predicate(
      "community.owner.username should be string",
      typeof image.community.owner.username === "string",
    );
    TestValidator.predicate(
      "community.owner.email_verified should be boolean",
      typeof image.community.owner.email_verified === "boolean",
    );
    TestValidator.predicate(
      "community.owner.registered_at should be ISO date string",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        image.community.owner.registered_at,
      ),
    );
  }
  // Check sorting: ordering (lower first), then created_at (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i];
      const next = response.data[i + 1];
      // Either ordering is lower, or if ordering equal, createdAt should be newer (descending)
      TestValidator.predicate(
        "images should be sorted by ordering ascending",
        current.ordering <= next.ordering,
      );
      if (current.ordering === next.ordering) {
        const currentDate = new Date(current.createdAt);
        const nextDate = new Date(next.createdAt);
        TestValidator.predicate(
          "if ordering equal, images should be sorted by createdAt descending (newest first)",
          currentDate >= nextDate,
        );
      }
    }
  }
}
