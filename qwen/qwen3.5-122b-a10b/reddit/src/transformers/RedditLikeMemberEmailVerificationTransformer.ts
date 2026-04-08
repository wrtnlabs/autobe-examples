import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeMemberEmailVerificationTransformer {
  export type Payload = Prisma.reddit_like_member_email_verificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reddit_like_member_id: true,
        token: true,
        email: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditLikeMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeMemberEmailVerification> {
    return {
      id: input.id,
      reddit_like_member_id: input.reddit_like_member_id,
      token: input.token,
      email: input.email,
      expires_at: toISOStringSafe(input.expires_at),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      member: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IRedditLikeMemberEmailVerification;
  }
}
