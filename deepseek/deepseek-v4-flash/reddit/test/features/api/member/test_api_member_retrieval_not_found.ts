import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a UUID that is extremely unlikely to correspond to any registered member
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the endpoint with the non-existent UUID and expect HTTP 404
  await TestValidator.httpError(
    "non-existent member returns 404",
    404,
    async () =>
      await api.functional.communityPlatform.members.at(connection, {
        memberId: nonExistentMemberId,
      }),
  );
}
