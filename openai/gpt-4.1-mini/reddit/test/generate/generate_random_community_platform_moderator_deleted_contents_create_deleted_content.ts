import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_deleted_content } from "../prepare/prepare_random_community_platform_deleted_content";

export async function generate_random_community_platform_moderator_deleted_contents_create_deleted_content(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformDeletedContent.ICreate>;
  },
): Promise<ICommunityPlatformDeletedContent> {
  const prepared: ICommunityPlatformDeletedContent.ICreate =
    prepare_random_community_platform_deleted_content(props.body);
  const result: ICommunityPlatformDeletedContent =
    await api.functional.communityPlatform.moderator.deletedContents.createDeletedContent(
      connection,
      { body: prepared },
    );
  return result;
}
