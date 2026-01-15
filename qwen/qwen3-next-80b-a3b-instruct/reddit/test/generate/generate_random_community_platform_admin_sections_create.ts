import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import { prepare_random_community_platform_section } from "../prepare/prepare_random_community_platform_section";
export async function generate_random_community_platform_admin_sections_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSection.ICreate>;
  },
): Promise<ICommunityPlatformSection> {
  const prepared: ICommunityPlatformSection.ICreate =
    prepare_random_community_platform_section(props.body);
  const result: ICommunityPlatformSection =
    await api.functional.communityPlatform.admin.sections.create(connection, {
      body: prepared,
    });
  return result;
}
