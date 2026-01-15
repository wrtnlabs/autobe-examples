import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductQuestionAnswer";
import { prepare_random_community_platform_product_question_answer } from "../prepare/prepare_random_community_platform_product_question_answer";
export async function generate_random_community_platform_member_products_questions_answers_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformProductQuestionAnswer.ICreate>
      | undefined;
    params: {
      productCode: string;
      questionId: string;
    };
  },
): Promise<ICommunityPlatformProductQuestionAnswer> {
  const prepared: ICommunityPlatformProductQuestionAnswer.ICreate =
    prepare_random_community_platform_product_question_answer(props.body);
  return await api.functional.communityPlatform.member.products.questions.answers.create(
    connection,
    {
      body: prepared,
      productCode: props.params.productCode,
      questionId: props.params.questionId,
    },
  );
}
