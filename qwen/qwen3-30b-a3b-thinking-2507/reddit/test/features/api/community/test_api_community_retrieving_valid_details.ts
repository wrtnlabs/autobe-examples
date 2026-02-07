import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_retrieving_valid_details(
  connection: api.IConnection,
): Promise<void> {
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.communityPlatform.communities.at(
    connection,
    {
      communityId,
    },
  );
  typia.assert(output);
  TestValidator.predicate("community has name", !!output.name);
  TestValidator.predicate("community has id", !!output.id);
  TestValidator.predicate("community has owner", !!output.owner);
  const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  TestValidator.predicate(
    "created_at has correct date-time format",
    dateRegex.test(output.created_at),
  );
  TestValidator.predicate(
    "updated_at has correct date-time format",
    dateRegex.test(output.updated_at),
  );
  if (output.description) {
    TestValidator.equals(
      "description is string",
      typeof output.description,
      "string",
    );
  }
  if (output.icon_url) {
    TestValidator.equals(
      "icon_url is string",
      typeof output.icon_url,
      "string",
    );
  }
  if (output.deleted_at) {
    TestValidator.predicate(
      "deleted_at has correct date-time format",
      dateRegex.test(output.deleted_at),
    );
  }
}
