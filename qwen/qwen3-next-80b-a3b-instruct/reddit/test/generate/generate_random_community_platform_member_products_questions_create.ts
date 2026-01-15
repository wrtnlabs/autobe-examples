import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductQuestion";
import { prepare_random_community_platform_product_question } from "../prepare/prepare_random_community_platform_product_question";
export async function generate_random_community_platform_member_products_questions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProductQuestion.ICreate>;
    params: {
      productCode: string;
    };
  },
): Promise<ICommunityPlatformProductQuestion> {
  const prepared: ICommunityPlatformProductQuestion.ICreate =
    prepare_random_community_platform_product_question(props.body);
  return await api.functional.communityPlatform.member.products.questions.create(
    connection,
    {
      body: prepared,
      productCode: props.params.productCode,
    },
  );
}
