import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallAdministratorRequestApplicantSeller } from "../../../../../api/structures/IShoppingMallAdministratorRequestApplicantSeller";
import { AdministratorAuth } from "../../../../../decorators/AdministratorAuth";
import { AdministratorPayload } from "../../../../../decorators/payload/AdministratorPayload";
import { getShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantSellersAdministratorRequestApplicantSellerId } from "../../../../../providers/getShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantSellersAdministratorRequestApplicantSellerId";
import { patchShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantSellers } from "../../../../../providers/patchShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantSellers";
import { postShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantSellers } from "../../../../../providers/postShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantSellers";

@Controller(
  "/shoppingMall/administrator/administrator-requests/:administratorRequestId/applicant-sellers",
)
export class ShoppingmallAdministratorAdministrator_requestsApplicant_sellersController {
  /**
   * Create the seller applicant link for a specific administrator application request.
   *
   * This endpoint records which seller account submitted the administrator request identified in the path. The administrator request table stores the canonical governance application data, including the applicant's reason and the current request status, while the normalized applicant link table keeps the seller association separate so the request remains unambiguous and the workflow stays properly structured.
   *
   * The request is intended for the administrator application flow in which a registered seller applies for administrative responsibility and the platform must preserve the relationship between the request and the submitting seller. The target administrator request must exist, must belong to the current application flow, and should still be in a pending state when the link is created. If the request already has an associated seller applicant, the operation must reject the duplicate association and leave the existing request data unchanged.
   *
   * Only the owning seller context or privileged administrative orchestration should be allowed to create this linkage. The request body should only provide the seller identifier needed to create the normalized applicant record; the administrator request identifier is taken from the URL path to avoid duplicating the parent reference and to keep the endpoint scoped to one specific governance request. This operation supports the review workflow used by super administrators when they inspect pending administrator applications.
   *
   * @param connection
   * @param administratorRequestId Administrator request identifier.
   * @param body Seller applicant information used to create the request linkage.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor administrator
   * @x-autobe-specification Implement as a create-style service that inserts one row into shopping_mall_administrator_request_applicant_sellers for the administrator request specified by administratorRequestId.
   *
   * Execution flow:
   * 1. Resolve and validate the parent shopping_mall_administrator_requests row by id.
   * 2. Confirm the request exists and is eligible for applicant-link creation, with a strong expectation that its status is pending.
   * 3. Validate that no applicant-seller link already exists for this administrator request, using the unique constraint on shopping_mall_administrator_request_id.
   * 4. Validate the supplied seller id exists in the seller domain and is allowed to be associated with the request.
   * 5. Insert the link row with shopping_mall_administrator_request_id and shopping_mall_seller_id in a transaction.
   * 6. Return the created link record.
   *
   * Business rules and edge cases:
   * - Reject if the administrator request does not exist.
   * - Reject if the request is already linked to a seller applicant.
   * - Reject if the request is not in a pending state or otherwise not eligible for applicant assignment.
   * - Reject if the supplied seller does not exist or is not a valid seller applicant.
   * - Let the database unique constraints protect against duplicate request-link or seller-link creation, and translate those violations into a duplicate-pending-administrator-request style conflict when appropriate.
   *
   * Data handling:
   * - Use the path parameter as the canonical administrator request id.
   * - Do not accept administratorRequestId in the request body.
   * - Persist only the normalized linkage fields plus timestamps; do not invent extra columns.
   * - Because the schema includes deleted_at, honor existing persistence conventions for the model if the runtime uses them, but this endpoint’s visible behavior is to create the active association record.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedParam("administratorRequestId")
    administratorRequestId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallAdministratorRequestApplicantSeller.ICreate,
  ): Promise<IShoppingMallAdministratorRequestApplicantSeller> {
    try {
      return await postShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantSellers(
        {
          administrator,
          administratorRequestId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the seller applicant linked to a specific administrator application request.
   *
   * This operation resolves the normalized seller applicant association for the administrator request identified by `administratorRequestId`. The underlying request record stores the application reason, current decision status, and any rejection reason, while the applicant-seller link table stores which seller account submitted the request. Together, these records support the administrator governance workflow by keeping the application record itself normalized and by making the applicant identity explicit and auditable.
   *
   * Use this operation when a reviewer or an applicant context needs to confirm which seller account is attached to the request currently being reviewed. The request-to-applicant relation is constrained as a one-to-one association, so a given administrator request can have at most one seller applicant link and a seller applicant can be associated with at most one administrator request. If the request has no seller applicant link, the server must not infer or synthesize one.
   *
   * Access to this resource should follow the administrator review boundary. It is intended for super-administrator review flows and any authorized request-ownership checks defined by the platform, not for arbitrary cross-request traversal. Consumers that need the full administrator request state should retrieve the parent request first and then use this endpoint to inspect the seller applicant association as supporting context.
   *
   * @param connection
   * @param administratorRequestId Administrator request identifier.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor administrator
   * @x-autobe-specification Load the administrator request applicant-seller link by the parent administrator request ID.
   *
   * Implementation should:
   * 1. Validate `administratorRequestId` as a UUID path identifier.
   * 2. Query `shopping_mall_administrator_requests` by id, ensuring the parent request exists.
   * 3. Join or look up `shopping_mall_administrator_request_applicant_sellers` by `shopping_mall_administrator_request_id`.
   * 4. Enforce the 1:1 uniqueness constraint from the schema; there should be at most one applicant-seller row for the request.
   * 5. Return a not-found style error if either the parent request does not exist or the request has no seller applicant link, following the platform's read semantics.
   * 6. Do not mutate any record; this endpoint is a pure retrieval.
   * 7. Do not expose fields that are not present in the loaded schema; the response should represent the applicant link and identifiers only, not invented seller profile data.
   *
   * If authorization is enforced at the service layer, restrict access to authorized administrator review actors and any legitimate applicant-owner visibility rule defined elsewhere. Because the loaded schema does not include seller fields, the service should not attempt to expand the seller relation beyond the association identifier unless additional schema context is loaded in a later step.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async patchByAdministratorrequestid(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedParam("administratorRequestId")
    administratorRequestId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallAdministratorRequestApplicantSeller> {
    try {
      return await patchShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantSellers(
        {
          administrator,
          administratorRequestId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the seller applicant link for a specific administrator application request.
   *
   * This operation returns the normalized applicant record that connects one administrator request to the seller account that submitted it. The underlying `shopping_mall_administrator_request_applicant_sellers` table exists specifically to keep administrator application ownership unambiguous and normalized, while the parent `shopping_mall_administrator_requests` table stores the request reason, current approval status, and rejection reason for the governance workflow.
   *
   * This endpoint is intended for administrator review flows, especially super administrators inspecting a pending request before deciding whether to approve or reject it. The response is scoped by both the administrator request identifier and the applicant-seller link identifier so that the caller can safely confirm the applicant relationship for a single request without relying on inferred ownership.
   *
   * Access to this resource should be restricted to administrator actors involved in request governance. The operation does not modify the request, does not create review history, and does not change approval status. It is a read-only lookup for displaying applicant identity and supporting the review process that occurs through the separate administrator request review workflow.
   *
   * @param connection
   * @param administratorRequestId Identifier of the administrator application request.
   * @param administratorRequestApplicantSellerId Identifier of the seller applicant link record within the administrator request.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor administrator
   * @x-autobe-specification Fetch a single seller-applicant linkage row by administrator request ID and applicant-link ID.
   * Validate that the two path identifiers refer to the same normalized relationship: load the applicant link by primary key, then ensure its administrator request foreign key matches the supplied administratorRequestId. If the row does not exist or belongs to a different request, return not found to avoid leaking cross-request relationships.
   *
   * Implementation should use a straightforward read query against shopping_mall_administrator_request_applicant_sellers, with the parent request optionally joined or checked for existence when enforcing referential consistency. No transaction is required because the operation is read-only. Do not load review history here; review decisions belong to the administrator request review APIs, while this endpoint only exposes the applicant linkage used by the review flow.
   *
   * Authorize administrator access only, with super administrator access preferred for review tooling. If the platform differentiates read scopes, ensure only users who can review administrator requests can call this endpoint.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":administratorRequestApplicantSellerId")
  public async getByAdministratorrequestidAndAdministratorrequestapplicantsellerid(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedParam("administratorRequestId")
    administratorRequestId: string & tags.Format<"uuid">,
    @TypedParam("administratorRequestApplicantSellerId")
    administratorRequestApplicantSellerId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallAdministratorRequestApplicantSeller> {
    try {
      return await getShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdApplicantSellersAdministratorRequestApplicantSellerId(
        {
          administrator,
          administratorRequestId,
          administratorRequestApplicantSellerId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
