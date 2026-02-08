import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment } from "../prepare/prepare_random_community_platform_comment";

export async function generate_random_community_platform_user_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformComment.ICreate> | undefined;
  },
): Promise<ICommunityPlatformComment> {
  const prepared: ICommunityPlatformComment.ICreate =
    prepare_random_community_platform_comment(props.body);
  const result: ICommunityPlatformComment =
    await api.functional.communityPlatform.user.comments.create(connection, {
      body: prepared,
    });
  return result;
}
