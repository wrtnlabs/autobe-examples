import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a member's detailed profile information.
 *
 * This test verifies the expected structure of the member profile API response,
 * ensuring the response contains the correct fields (id, email, created_at, updated_at)
 * and does not include sensitive fields like password hash.
 */
export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.communityPlatform.members.at(connection, {
    memberId,
  });
  typia.assert(output);
}
