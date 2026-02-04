import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
export function prepare_random_community_platform_post(
  input?: DeepPartial<ICommunityPlatformPost.ICreate>,
): ICommunityPlatformPost.ICreate {
  // Generate one content type randomly while keeping the others undefined to maintain mutual exclusivity
  const contentTypes = ["text", "url", "image"] as const;
  const chosenContent =
    input?.text !== undefined
      ? "text"
      : input?.url !== undefined
        ? "url"
        : input?.image !== undefined
          ? "image"
          : (RandomGenerator.pick(contentTypes) as "text" | "url" | "image");
  return {
    // Test-customizable: title with 1-300 chars constraint
    title:
      input?.title ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 7,
      }).substring(0, 300),
    // Auto-generated or input-customizable: text (≤10,000 chars)
    text:
      chosenContent === "text"
        ? (input?.text ??
          RandomGenerator.content({
            paragraphs: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
            sentenceMin: 5,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }).substring(0, 10000))
        : undefined,
    // Auto-generated or input-customizable: url (URI format)
    url:
      chosenContent === "url"
        ? (input?.url ?? typia.random<string & tags.Format<"uri">>())
        : undefined,
    // Auto-generated or input-customizable: image
    image:
      chosenContent === "image"
        ? ((input?.image ?? {
            filename: `${RandomGenerator.alphaNumeric(16)}.${RandomGenerator.pick(["jpg", "jpeg", "png", "gif"] as const)}`,
            extension: RandomGenerator.pick([
              "jpg",
              "jpeg",
              "png",
              "gif",
            ] as const),
            size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<5000000>
            >(),
            url: typia.random<string & tags.Format<"uri">>(),
          }) satisfies Omit<ICommunityPlatformPost.ICreate["image"], "undefined"> as ICommunityPlatformPost.ICreate["image"]) 
        : undefined,
  };
}