import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random member ID for testing
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve the member profile
  const profile = await api.functional.community.members.at(connection, {
    memberId,
  });
  // Validate the response type and structure
  typia.assert(profile);
  // Verify the response is an object as defined by ICommunityMember {}
  TestValidator.predicate("response is an object", typeof profile === "object");
  TestValidator.predicate("response is not null", profile !== null);
  TestValidator.predicate(
    "response has no properties",
    Object.keys(profile).length === 0,
  );
}
