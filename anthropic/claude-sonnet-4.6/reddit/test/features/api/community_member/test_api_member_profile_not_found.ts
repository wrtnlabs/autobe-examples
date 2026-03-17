import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Use a plain connection (no auth required — public endpoint)
  const publicConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID that does not correspond to any registered member
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the profile of the non-existent member
  // Expect a not-found error (HTTP 404)
  await TestValidator.error(
    "non-existent member profile should return not-found",
    async () => {
      await api.functional.community.members.at(publicConnection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
