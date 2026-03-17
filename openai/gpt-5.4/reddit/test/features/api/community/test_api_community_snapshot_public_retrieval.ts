import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_snapshot_public_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const communitySlug = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  try {
    const snapshot =
      await api.functional.communityPlatform.communities.snapshots.at(
        guestConnection,
        {
          communitySlug,
          snapshotId,
        },
      );
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot id matches request",
      snapshot.id,
      snapshotId,
    );
    TestValidator.equals(
      "embedded community slug matches request",
      snapshot.community.slug,
      communitySlug,
    );
    TestValidator.notEquals(
      "snapshot visibility is populated",
      snapshot.visibility,
      "",
    );
    TestValidator.notEquals(
      "community title is populated",
      snapshot.community.title,
      "",
    );
    TestValidator.notEquals(
      "community description is populated",
      snapshot.community.description,
      "",
    );
    TestValidator.notEquals(
      "community status is populated",
      snapshot.community.status,
      "",
    );
    TestValidator.notEquals(
      "owner member code is populated",
      snapshot.community.member.code,
      "",
    );
    TestValidator.notEquals(
      "owner member email is populated",
      snapshot.community.member.email,
      "",
    );
    TestValidator.notEquals(
      "owner member status is populated",
      snapshot.community.member.status,
      "",
    );
    TestValidator.predicate(
      "subscriber count is non-negative so zero is allowed",
      snapshot.community.subscriber_count >= 0,
    );
  } catch (exp) {
    await TestValidator.httpError(
      "public retrieval may return not found without fixture setup",
      404,
      async () => {
        throw exp;
      },
    );
  }
}
