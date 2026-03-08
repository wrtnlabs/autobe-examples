import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const testConnection: api.IConnection = { host: connection.host };
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const member = await api.functional.redditLike.members.at(testConnection, {
    memberId,
  });
  typia.assert(member);
}
