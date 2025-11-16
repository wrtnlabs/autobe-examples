import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaq";

export async function test_api_shopping_mall_faq_public_retrieval(
  connection: api.IConnection,
) {
  // Generate a random UUID for the requested FAQ id
  const faqId = typia.random<string & tags.Format<"uuid">>();

  // Call the API to get the FAQ by id
  const faq: IShoppingMallFaq = await api.functional.shoppingMall.faqs.at(
    connection,
    {
      id: faqId,
    },
  );

  // Validate that the response matches the IShoppingMallFaq type exactly
  typia.assert(faq);

  // Validate each property for logical correctness
  TestValidator.predicate(
    "faq id is a uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      faq.id,
    ),
  );

  TestValidator.predicate(
    "faq question is a non-empty string",
    typeof faq.question === "string" && faq.question.length > 0,
  );

  TestValidator.predicate(
    "faq answer is a non-empty string",
    typeof faq.answer === "string" && faq.answer.length > 0,
  );

  TestValidator.predicate(
    "faq created_at is ISO-8601 date-time string",
    typeof faq.created_at === "string" && !isNaN(Date.parse(faq.created_at)),
  );

  if (faq.updated_at !== undefined) {
    TestValidator.predicate(
      "faq updated_at is undefined or ISO-8601 date-time string",
      faq.updated_at === undefined ||
        (typeof faq.updated_at === "string" &&
          !isNaN(Date.parse(faq.updated_at))),
    );
  }
}
