import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRefund";
import { prepare_random_community_platform_refund } from "../prepare/prepare_random_community_platform_refund";
export async function generate_random_community_platform_member_salesrefunds_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformRefund.ICreate>;
  },
): Promise<ICommunityPlatformRefund> {
  const prepared: ICommunityPlatformRefund.ICreate =
    prepare_random_community_platform_refund(props.body);
  return await api.functional.communityPlatform.member.salesrefunds.create(
    connection,
    {
      body: prepared,
    },
  );
}
