import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { IShoppingMallReviewPolicy } from "../../../../structures/IShoppingMallReviewPolicy";
import { IPageIShoppingMallReviewPolicy } from "../../../../structures/IPageIShoppingMallReviewPolicy";

/**
 * Create a new review policy in the shopping_mall_review_policies table.
 *
 * Create a new review policy configuration in the shopping_mall_review_policies
 * table.
 *
 * This operation is used by the shoppingMall platform’s administrative tools to
 * define how product reviews and ratings behave. The underlying Prisma model
 * describes shopping_mall_review_policies as "Review and rating policy
 * definitions for the shoppingMall platform" and explains that each record
 * defines rules governing product reviews and ratings, including eligibility,
 * time windows, content restrictions, and moderation behavior. When this
 * endpoint is called, it persists a new policy entity that downstream review
 * subsystems can consult when deciding whether a customer may create or edit a
 * review, how reports should be interpreted, and when reviews should be
 * automatically hidden pending moderation.
 *
 * The request body, typed as IShoppingMallReviewPolicy.ICreate, should provide
 * a non-null code string that acts as the business identifier (for example,
 * "default_review" or "strict_moderation"). The Prisma schema enforces a unique
 * index on code, so the implementation must reject duplicate codes. The name
 * field is also required and stores a human-readable policy name for admin UIs.
 * An optional description field allows administrators to document details of
 * the policy, including eligibility, moderation strategies, and time windows,
 * matching the semantics described in the model comment.
 *
 * Numeric configuration fields mirror the schema’s optional integer columns.
 * The max_days_after_delivery_for_review field defines the maximum number of
 * days after delivered status during which a customer can submit a review; when
 * null, the policy may defer to other configuration. The allow_edit_within_days
 * field controls how long after review creation editing is allowed. The
 * auto_hide_report_threshold integer defines how many distinct abuse reports
 * are required before a review is automatically hidden, corresponding to the
 * schema description that this triggers automatic hiding pending moderation
 * when not null. The config_payload column stores a serialized configuration
 * payload (typically JSON text) containing additional rules such as prohibited
 * content categories or rating scale specifics.
 *
 * Temporal and lifecycle fields support policy activation and retirement. The
 * active boolean column, which is non-nullable, indicates whether this policy
 * is currently active for review flows. The effective_from and effective_to
 * datetime fields optionally bound the period during which the policy applies
 * to new operations. Lifecycle timestamps like created_at and updated_at are
 * typically managed by the backend service or database defaults; they record
 * when the policy was created and last modified, without requiring clients to
 * supply values. If the model includes a deleted_at datetime column, it is used
 * as a soft deletion timestamp to indicate that the policy is retired from
 * active use but preserved for historical references, as described in the
 * schema.
 *
 * The model can also include optional foreign keys such as
 * shopping_mall_region_setting_id and shopping_mall_policy_setting_id with
 * relations regionSetting and policySetting. These let administrators scope
 * policies to specific regions via shopping_mall_region_settings or bind them
 * to shared configuration profiles in shopping_mall_policy_settings. When these
 * fields are present and non-null in the DTO, the implementation should
 * validate that referenced region and policy-setting records exist; when
 * omitted or null, the policy is treated as global or relying solely on its own
 * configuration payload.
 *
 * This endpoint must be restricted to privileged actors because review policies
 * directly affect user-generated content behavior and moderation. The
 * authorizationActors field is set to ["platformAdmin"], indicating that
 * callers must represent a platform administrator role. Client-side admin tools
 * will typically call this endpoint when creating new policies, while related
 * operations like PUT
 * /shoppingMall/platformAdmin/reviewPolicies/{reviewPolicyCode} handle
 * subsequent modifications, and read-only endpoints retrieve policy details or
 * lists without changing data.
 *
 * @param props.connection
 * @param props.body Payload for creating a new review policy, including unique
 *   business code, name, activation flags, temporal bounds, thresholds,
 *   configuration payload, and optional region/policy-setting references.
 * @path /shoppingMall/platformAdmin/reviewPolicies
 * @accessor api.functional.shoppingMall.platformAdmin.reviewPolicies.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Payload for creating a new review policy, including unique business
     * code, name, activation flags, temporal bounds, thresholds,
     * configuration payload, and optional region/policy-setting
     * references.
     */
    body: IShoppingMallReviewPolicy.ICreate;
  };
  export type Body = IShoppingMallReviewPolicy.ICreate;
  export type Response = IShoppingMallReviewPolicy;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/platformAdmin/reviewPolicies",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/platformAdmin/reviewPolicies";
  export const random = (): IShoppingMallReviewPolicy =>
    typia.random<IShoppingMallReviewPolicy>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Search and paginate shopping_mall_review_policies records for admin
 * review-policy management.
 *
 * Retrieve a filtered and paginated list of review policy definitions from the
 * shopping_mall_review_policies table for administrative management of product
 * review behavior.
 *
 * This operation queries the shopping_mall_review_policies model, whose
 * description explains that it holds "Review and rating policy definitions for
 * the shoppingMall platform" and that "Each record defines rules governing
 * product reviews and ratings, including eligibility, time windows, content
 * restrictions, and moderation behavior." The list endpoint makes these
 * entities discoverable to platform administrators so they can understand and
 * manage which policies are in effect across regions and configuration
 * profiles. It focuses on returning summary-level data such as the business
 * code, human-readable name, active flag, effective period, and key numeric
 * thresholds like max_days_after_delivery_for_review and
 * auto_hide_report_threshold, which directly affect when customers can write
 * reviews and when reviews get automatically hidden.
 *
 * From a security and authorization standpoint, this endpoint should only be
 * accessible to administrative actors who manage marketplace-wide rules.
 * Regular customers, sellers, or guests must not be able to list or probe
 * internal review policy definitions, because revealing internal moderation
 * thresholds and configuration payloads could be abused to game the review
 * system. Therefore, authorizationActors is set to ["platformAdmin"], and the
 * implementation should further verify that the authenticated platform admin
 * has appropriate role assignments according to tables like
 * shopping_mall_admin_roles and shopping_mall_admin_role_assignments if those
 * are present in the broader schema.
 *
 * In terms of its relationship to the underlying database entity, the operation
 * may filter by foreign keys shopping_mall_region_setting_id and
 * shopping_mall_policy_setting_id, using those to find policies scoped to
 * particular regions (as described by the regionSetting relation) or to
 * specific policySetting configuration profiles. It should also take advantage
 * of the index on (shopping_mall_region_setting_id, active) to efficiently
 * fetch active policies per region, and the indexes on effective_from and
 * effective_to to support filtering by effective period. Full-text search over
 * the name and description columns can leverage the provided GIN indexes, so
 * the IRequest DTO may contain search text which the implementation maps to
 * ILIKE or full-text expressions.
 *
 * The request body type IShoppingMallReviewPolicy.IRequest encapsulates all
 * filter parameters, search text, pagination limits, and sort options. The
 * client SHOULD NOT send primary key values or internal timestamps inside this
 * object if those are already represented as separate path parameters (there
 * are none for this list) or are purely internal. The implementation must
 * validate filter ranges (for example, that minDays is not greater than maxDays
 * if such filters exist) and gracefully handle null values that mean "no
 * restriction" for fields like max_days_after_delivery_for_review,
 * allow_edit_within_days, and auto_hide_report_threshold.
 *
 * The response body type IPageIShoppingMallReviewPolicy.ISummary conforms to a
 * standard pagination envelope containing metadata like totalCount, page, and
 * pageSize, plus an array of summary objects. Each summary should at least
 * include id, code, name, active, effective_from, effective_to, and possibly a
 * short excerpt of description or high-level status flags. It should not expose
 * large config_payload blobs in summary records; those are better retrieved via
 * a detail endpoint. Admin UIs can use this listing API as the primary source
 * for review policy search, selection, and navigation to detail views.
 *
 * @param props.connection
 * @param props.body Filter, search, sort, and pagination criteria for listing
 *   review policies from shopping_mall_review_policies.
 * @path /shoppingMall/platformAdmin/reviewPolicies
 * @accessor api.functional.shoppingMall.platformAdmin.reviewPolicies.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Filter, search, sort, and pagination criteria for listing review
     * policies from shopping_mall_review_policies.
     */
    body: IShoppingMallReviewPolicy.IRequest;
  };
  export type Body = IShoppingMallReviewPolicy.IRequest;
  export type Response = IPageIShoppingMallReviewPolicy.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/platformAdmin/reviewPolicies",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/platformAdmin/reviewPolicies";
  export const random = (): IPageIShoppingMallReviewPolicy.ISummary =>
    typia.random<IPageIShoppingMallReviewPolicy.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Get a single shopping_mall_review_policies record by its unique
 * reviewPolicyCode.
 *
 * Retrieve a detailed review-policy definition from the
 * shopping_mall_review_policies table by its unique business code for
 * administrative inspection and configuration tooling.
 *
 * The shopping_mall_review_policies model describes "Review and rating policy
 * definitions for the shoppingMall platform" and explains that each record
 * governs eligibility, time windows, moderation behavior, and other rules
 * affecting customer product reviews. This GET
 * /reviewPolicies/{reviewPolicyCode} endpoint uses the business-facing code
 * column, which is constrained by a unique index ("Ensures that each review
 * policy has a unique business code"), as the path identifier rather than the
 * opaque UUID id. This makes it easier for admins and backend integrations to
 * refer to well-known policies such as "default_review" or "strict_moderation"
 * in URLs and configuration.
 *
 * From a security perspective, the endpoint must be restricted to platform
 * administrators, because it may expose internal details such as
 * config_payload, which is described as a "Serialized configuration payload
 * describing additional review rules, such as prohibited content categories or
 * rating scale specifics." Exposing such internal configuration structures to
 * customers or sellers could compromise moderation strategies by revealing
 * exactly which patterns are being detected or limited. Therefore,
 * authorizationActors is set to ["platformAdmin"], and the implementation
 * should integrate with the broader authentication and authorization stack to
 * ensure only legitimate admin actors can call this API.
 *
 * In terms of database relationships, the response may include identifiers or
 * nested DTOs for the optional foreign keys shopping_mall_region_setting_id and
 * shopping_mall_policy_setting_id. The regionSetting relation links to
 * shopping_mall_region_settings to indicate which region this policy targets,
 * while the policySetting relation links to shopping_mall_policy_settings for
 * shared configuration profiles. The DTO should also expose temporal fields
 * like effective_from and effective_to so that administrators can understand
 * when the policy is or was active, as well as the active boolean and
 * deleted_at timestamp, which acts as a retirement marker preserving historical
 * references.
 *
 * The operation returns an IShoppingMallReviewPolicy DTO that reflects the full
 * current state of the policy row. If the provided reviewPolicyCode does not
 * correspond to any row in shopping_mall_review_policies, the implementation
 * must return a 404 Not Found error. If business rules dictate that records
 * with non-null deleted_at are no longer retrievable, those should also produce
 * a 404 or a domain-specific error. The endpoint is typically used together
 * with the listing endpoint PATCH /reviewPolicies, where an admin first
 * searches for relevant policies and then drills down into a specific policy
 * using its code.
 *
 * @param props.connection
 * @param props.reviewPolicyCode Unique business identifier code of the target
 *   review policy (global scope) corresponding to the code column in
 *   shopping_mall_review_policies.
 * @path /shoppingMall/platformAdmin/reviewPolicies/:reviewPolicyCode
 * @accessor api.functional.shoppingMall.platformAdmin.reviewPolicies.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Unique business identifier code of the target review policy (global
     * scope) corresponding to the code column in
     * shopping_mall_review_policies.
     */
    reviewPolicyCode: string;
  };
  export type Response = IShoppingMallReviewPolicy;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/platformAdmin/reviewPolicies/:reviewPolicyCode",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/platformAdmin/reviewPolicies/${encodeURIComponent(props.reviewPolicyCode ?? "null")}`;
  export const random = (): IShoppingMallReviewPolicy =>
    typia.random<IShoppingMallReviewPolicy>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("reviewPolicyCode")(() =>
        typia.assert(props.reviewPolicyCode),
      );
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Update an existing review policy in the shopping_mall_review_policies table
 * by its unique code.
 *
 * Update an existing review policy configuration in the
 * shopping_mall_review_policies table, targeting it by its business code.
 *
 * The reviewPolicyCode path parameter maps directly to the code field of the
 * shopping_mall_review_policies model. The Prisma schema describes code as a
 * non-nullable string with a unique index that ensures each review policy has a
 * distinct business identifier. This endpoint uses that unique code, which
 * typically holds values like "default_review" or "strict_moderation", to find
 * exactly one policy row. Because the uniqueness constraint is enforced at the
 * database level, if the implementation permits updating code itself, it must
 * handle conflicts with other records and surface appropriate error responses.
 *
 * The request body typed as IShoppingMallReviewPolicy.IUpdate carries the
 * fields that administrators may change over time. The name and description
 * fields can be updated to improve clarity about the policy’s behavior; name
 * remains required at the data model level, while description is nullable and
 * may be added or removed as needed. Numeric configuration columns such as
 * max_days_after_delivery_for_review, allow_edit_within_days, and
 * auto_hide_report_threshold can be tuned to reflect evolving moderation and
 * eligibility requirements. For example, a platform may increase
 * max_days_after_delivery_for_review to allow more time for reviews, or lower
 * auto_hide_report_threshold to trigger automatic hiding more aggressively
 * based on abuse reports.
 *
 * The config_payload field stores serialized configuration data, usually as
 * JSON, that encodes additional rules like prohibited content categories or
 * rating scales. Updating this field allows sophisticated policy changes
 * without altering the schema. Temporal fields effective_from and effective_to
 * define an optional validity window for the policy; administrators may set or
 * adjust these dates when planning rollouts or retirements of specific
 * policies. The active boolean field indicates whether the policy should
 * currently be considered in review workflows. Combined with effective_from and
 * effective_to, it provides fine-grained control over when a policy is
 * applied.
 *
 * Lifecycle timestamps created_at, updated_at, and any soft deletion field
 * (such as deleted_at if present in the model) must be managed consistently.
 * The implementation must preserve created_at as the original creation time,
 * update updated_at on each successful modification, and, when implementing
 * soft deletion, manage deleted_at to mark policies as retired while keeping
 * them for historical references, matching the schema description. Update
 * operations may choose to set deleted_at when retiring a policy instead of
 * removing it, ensuring that historical review records that reference the
 * policy continue to have a valid link.
 *
 * The endpoint also allows updating optional foreign-key relations like
 * shopping_mall_region_setting_id and shopping_mall_policy_setting_id, which
 * reference shopping_mall_region_settings and shopping_mall_policy_settings
 * models, respectively. Adjusting these links lets administrators re-scope a
 * policy to a different region or shared configuration profile, or clear them
 * by setting the fields to null. The implementation must verify referential
 * integrity whenever these fields change.
 *
 * Access to this operation must be restricted because changing review policies
 * has significant impact on user-generated content and moderation strategies
 * across the marketplace. The authorizationActors field is set to
 * ["platformAdmin"], indicating that only platform administrator actors are
 * allowed to invoke this endpoint. In practice, this endpoint is often paired
 * with POST /shoppingMall/platformAdmin/reviewPolicies for creation and
 * read-only endpoints for listing and inspecting policies, forming a complete
 * administrative management suite for the shopping_mall_review_policies table.
 *
 * @param props.connection
 * @param props.reviewPolicyCode Unique business identifier code of the target
 *   review policy in the shopping_mall_review_policies table (global scope).
 * @param props.body Payload for updating an existing review policy, including
 *   adjustments to thresholds, activation flags, temporal bounds, configuration
 *   payload, and optional region/policy-setting references.
 * @path /shoppingMall/platformAdmin/reviewPolicies/:reviewPolicyCode
 * @accessor api.functional.shoppingMall.platformAdmin.reviewPolicies.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Unique business identifier code of the target review policy in the
     * shopping_mall_review_policies table (global scope).
     */
    reviewPolicyCode: string;

    /**
     * Payload for updating an existing review policy, including adjustments
     * to thresholds, activation flags, temporal bounds, configuration
     * payload, and optional region/policy-setting references.
     */
    body: IShoppingMallReviewPolicy.IUpdate;
  };
  export type Body = IShoppingMallReviewPolicy.IUpdate;
  export type Response = IShoppingMallReviewPolicy;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/platformAdmin/reviewPolicies/:reviewPolicyCode",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/shoppingMall/platformAdmin/reviewPolicies/${encodeURIComponent(props.reviewPolicyCode ?? "null")}`;
  export const random = (): IShoppingMallReviewPolicy =>
    typia.random<IShoppingMallReviewPolicy>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("reviewPolicyCode")(() =>
        typia.assert(props.reviewPolicyCode),
      );
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}

/**
 * Delete an existing review policy from the shopping_mall_review_policies table
 * by its unique code.
 *
 * Delete an existing review policy configuration from the
 * shopping_mall_review_policies table using its unique business code.
 *
 * This operation targets the shopping_mall_review_policies Prisma model, which
 * holds platform-level review and rating policy definitions for the
 * shoppingMall service. Each row defines a coherent set of rules controlling
 * how customers can submit reviews, how star ratings are interpreted, and what
 * moderation behavior applies. The model typically includes columns such as a
 * unique code used as an external identifier, descriptive metadata for
 * administrators, flags controlling whether certain types of content are
 * allowed, and numeric thresholds for actions like automatic hiding or
 * escalation of reviews.
 *
 * When a DELETE request is issued to this endpoint, the implementation must
 * first validate that the caller is an authorized administrative actor, as
 * review policies affect user-generated content across all products and could
 * impact the integrity of rating aggregates. The handler then uses the
 * reviewPolicyCode path parameter, which maps to the unique code column on
 * shopping_mall_review_policies, to look up the target row. If no policy is
 * found for the given code, the operation should respond with a not-found error
 * indicating that the specified review policy does not exist.
 *
 * If the policy exists, the system must determine whether it is safe to remove
 * it based on business rules. For example, certain policies may be marked as
 * default or mandatory in the schema comments or may be referenced by immutable
 * audit logs or historical review snapshots. In such cases, deletion should be
 * rejected with a clear explanation. For policies that are not constrained, the
 * record is removed from the database so that it can no longer be used by
 * moderation or review submission logic. The endpoint may optionally return
 * basic information about the deleted policy or simply a success status,
 * depending on the DTO design for IShoppingMallReviewPolicy.
 *
 * This operation is typically used together with list and detail endpoints on
 * shopping_mall_review_policies. Administrators can first retrieve the current
 * catalog of policies via a PATCH search endpoint and then call this DELETE to
 * remove obsolete or incorrectly defined policies. Creation and update
 * endpoints on the same model handle initial configuration and subsequent
 * adjustments, while this delete endpoint finalizes the lifecycle by allowing
 * complete removal when appropriate.
 *
 * @param props.connection
 * @param props.reviewPolicyCode Unique business identifier code of the target
 *   review policy configuration (global scope) in the
 *   shopping_mall_review_policies table.
 * @path /shoppingMall/platformAdmin/reviewPolicies/:reviewPolicyCode
 * @accessor api.functional.shoppingMall.platformAdmin.reviewPolicies.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Unique business identifier code of the target review policy
     * configuration (global scope) in the shopping_mall_review_policies
     * table.
     */
    reviewPolicyCode: string;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/platformAdmin/reviewPolicies/:reviewPolicyCode",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/platformAdmin/reviewPolicies/${encodeURIComponent(props.reviewPolicyCode ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("reviewPolicyCode")(() =>
        typia.assert(props.reviewPolicyCode),
      );
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
