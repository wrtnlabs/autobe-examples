import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProductQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductQuestion";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_product_question_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Retrieve a product question using a valid productCode and questionId
  // Note: Cannot create questions since no create endpoint is available
  // Must use valid existing data from server
  const productCode = "PROD-" + RandomGenerator.alphaNumeric(8);
  const questionId = typia.random<string & tags.Format<"uuid">>();
  const retrievedQuestion: ICommunityPlatformProductQuestion =
    await api.functional.communityPlatform.products.questions.at(
      memberConnection,
      {
        productCode: productCode,
        questionId: questionId,
      },
    );
  typia.assert(retrievedQuestion);
  // Step 3: Validate retrieved question has all required fields with correct types
  TestValidator.predicate(
    "productCode is a string",
    typeof retrievedQuestion.productCode === "string",
  );
  TestValidator.predicate(
    "questionText is a string",
    typeof retrievedQuestion.questionText === "string",
  );
  TestValidator.predicate(
    "questionText length is reasonable",
    retrievedQuestion.questionText.length >= 1 &&
      retrievedQuestion.questionText.length <= 500,
  );
  TestValidator.predicate(
    "answerText is either string or null",
    retrievedQuestion.answerText === null ||
      (typeof retrievedQuestion.answerText === "string" &&
        retrievedQuestion.answerText.length <= 2000),
  );
  TestValidator.predicate(
    "isVisible is boolean or undefined",
    retrievedQuestion.isVisible === undefined ||
      typeof retrievedQuestion.isVisible === "boolean",
  );
  TestValidator.predicate(
    "createdAt is a valid date-time string",
    new Date(retrievedQuestion.createdAt) instanceof Date &&
      !isNaN(new Date(retrievedQuestion.createdAt).getTime()),
  );
  TestValidator.predicate(
    "id is a valid UUID",
    typeof retrievedQuestion.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        retrievedQuestion.id,
      ),
  );
  // Ensure all required properties are present
  TestValidator.equals(
    "productCode is not empty",
    retrievedQuestion.productCode.length > 0,
    true,
  );
  TestValidator.equals(
    "questionText is not empty",
    retrievedQuestion.questionText.length > 0,
    true,
  );
  TestValidator.equals(
    "question ID is not empty",
    retrievedQuestion.id.length > 0,
    true,
  );
  TestValidator.equals(
    "createdAt is not empty",
    retrievedQuestion.createdAt.length > 0,
    true,
  );
}
