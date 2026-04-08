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

export namespace RedditLikeMemberEmailVerificationAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_member_email_verificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
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
  ): Promise<IRedditLikeMemberEmailVerification.ISummary> {
    return {
      id: input.id,
      token: input.token,
      email: input.email,
      expires_at: input.expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      member: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IRedditLikeMemberEmailVerification.ISummary;
  }
}
