import { IEcommerceReviewReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * 生成长假电子商务平台评价举报的测试数据创建函数。
 *
 * @param input - 可选的深度部分输入参数，允许测试时自定义特定字段，其他字段将自动生成。
 * @returns 完整的IEcommerceReviewReport.ICreate对象，包含现实测试数据。
 */
export function prepare_random_ecommerce_review_report(
  input?: DeepPartial<IEcommerceReviewReport.ICreate>,
): IEcommerceReviewReport.ICreate {
  return {
    report_reason:
      input?.report_reason ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 5,
      }),
    report_category:
      input?.report_category ??
      RandomGenerator.pick([
        "spam",
        "inappropriate",
        "misinformation",
        "harassment",
        "offensive",
        "fake_review",
        "other",
      ] as const),
  };
}
