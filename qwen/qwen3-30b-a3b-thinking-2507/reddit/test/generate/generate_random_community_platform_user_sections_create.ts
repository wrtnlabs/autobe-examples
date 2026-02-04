import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_section } from "../prepare/prepare_random_community_platform_section";

export async function generate_random_community_platform_user_sections_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSection.ICreate> | undefined;
  },
): Promise<ICommunityPlatformSection> {
  const prepared: ICommunityPlatformSection.ICreate =
    prepare_random_community_platform_section(props.body);
  return await api.functional.communityPlatform.user.sections.create(
    connection,
    {
      body: prepared,
    },
  );
}
