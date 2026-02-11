import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_listing_with_search(
  connection: api.IConnection,
): Promise<void> {
  const testConnection = { host: connection.host };
  const searchTerm = RandomGenerator.name().substring(0, 5);
  const response = await api.functional.community.communities.index(
    testConnection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 10,
      },
    },
  );
  const validatedResponse = typia.assert(response);
  TestValidator.equals(
    "response should have pagination",
    !!validatedResponse.pagination,
    true,
  );
  TestValidator.equals(
    "response should have data",
    Array.isArray(validatedResponse.data),
    true,
  );
  validatedResponse.data.forEach((community) => {
    TestValidator.equals("community should have id", !!community.id, true);
    TestValidator.equals("community should have name", !!community.name, true);
    TestValidator.equals(
      "community description should be string|null",
      typeof community.description === "string" ||
        community.description === null,
      true,
    );
    TestValidator.equals(
      "community icon URL should be string|null",
      typeof community.icon_url === "string" || community.icon_url === null,
      true,
    );
    TestValidator.equals(
      "community should have owner",
      !!community.owner,
      true,
    );
    TestValidator.equals(
      "community created_at should be valid date-time",
      typeof community.created_at === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
          community.created_at,
        ),
      true,
    );
    TestValidator.equals(
      "community deleted_at should be valid date-time or null",
      community.deleted_at === null ||
        (typeof community.deleted_at === "string" &&
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
            community.deleted_at,
          )),
      true,
    );
  });
  if (validatedResponse.data.length > 0) {
    const firstCommunity = validatedResponse.data[0];
    const searchTermLower = searchTerm.toLowerCase();
    const nameLower = firstCommunity.name.toLowerCase();
    TestValidator.equals(
      "search term should match community name",
      nameLower.includes(searchTermLower),
      true,
    );
  }
}
