import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReply";
export function prepare_random_community_bbs_comment_reply(
  input?: DeepPartial<ICommunityBbsCommentReply.ICreate>,
): ICommunityBbsCommentReply.ICreate {
  // Generate a random number of metadata entries (1-5)
  const count = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  // Create output object with random metadata entries
  const result: ICommunityBbsCommentReply.ICreate = {};
  // Generate random key-value pairs for each entry
  for (let i = 0; i < count; i++) {
    // Generate a random key with 3-12 alphabetic characters
    const key = RandomGenerator.alphabets(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<12>
      >(),
    );
    // Generate a random value with 1 sentence of descriptive text
    const value = RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 8,
    });
    // Assign to result object
    result[key] = input?.[key] ?? value;
  }
  return result;
}
