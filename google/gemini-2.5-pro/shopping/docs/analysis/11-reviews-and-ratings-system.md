# 11. Reviews and Ratings System

## 1. Introduction

This document outlines the functional requirements for the product reviews and ratings system on the e-commerce platform. The primary goal of this system is to build trust and provide social proof by allowing customers who have purchased a product to share their feedback. This feedback helps other potential buyers make informed decisions and provides valuable insights to sellers and platform administrators.

This specification covers the entire lifecycle of user-generated feedback, including the initial submission by a verified customer, the moderation process for both reviews and seller responses, and their public display on the relevant product page. This includes both a quantitative rating (stars) and qualitative feedback (text-based review and responses).

## 2. Core Functional Requirements

The integrity of the review system is paramount. The following rules must be strictly enforced to ensure that all reviews are authentic, helpful, and trustworthy.

### 2.1. Verified Purchaser Requirement

The cornerstone of the system's credibility is ensuring that only legitimate buyers can leave feedback.

-   **WHEN** a user attempts to submit a review for a product, **THE** system **SHALL** verify that the user has an order in their history with a status of "Delivered" which contains that specific product.
-   **IF** a user who has not purchased a product attempts to submit a review, **THEN THE** system **SHALL** prevent the submission and display an error message explaining the requirement.
-   **IF** a `customer` attempts to submit a second review for the same product from the same order, **THEN THE** system **SHALL** prevent the submission and inform the user they have already reviewed the item.

### 2.2. Review and Response Content

All submitted content must adhere to a standard format.

-   **THE** system **SHALL** enforce a rating scale of 1 to 5 stars, which is a mandatory component of any review.
-   **THE** system **SHALL** require a text-based comment for all reviews and seller responses.
-   **THE** system **SHALL** enforce a minimum character limit of 20 and a maximum of 2000 for all review and response text.

## 3. Review Submission and Moderation Workflow

The process is designed to be straightforward for users while ensuring robust quality control through moderation.

### 3.1. Customer Review Submission

1.  A `customer` navigates to the page of a product they have purchased and received.
2.  The system presents a "Write a Review" option.
3.  The customer submits the review, including a star rating (1-5) and a text comment.
4.  **WHEN** a `customer` submits a new review, **THE** system **SHALL** validate the content against constraints and save it with a `Pending` status for moderation.

### 3.2. Administrator Moderation of Reviews

An `admin` is responsible for maintaining the quality of all user-generated content.

-   **THE** system **SHALL** provide `admins` with a dedicated dashboard to view a queue of all reviews in the `Pending` state.
-   **WHEN** an `admin` approves a pending review, **THE** system **SHALL** change the review's status to `Approved`.
-   **WHEN** an `admin` rejects a pending review, **THE** system **SHALL** change the review's status to `Rejected`, log the reason for rejection, and ensure it is not publicly visible.
-   **WHILE** a review is in the `Pending` or `Rejected` state, **THE** system **SHALL NOT** include its rating in the product's average calculation or display it on the public product page.

## 4. Seller Response Workflow

Sellers are given the opportunity to engage with customer feedback directly on the platform, subject to the same quality control as customer reviews.

### 4.1. Submitting a Response

-   **WHEN** a customer review for a seller's product is approved, **THE** system **SHALL** notify the `seller`.
-   **THE** system **SHALL** provide an interface for the `seller` to write and submit a response to an approved customer review on their product.
-   **WHEN** a `seller` submits a response, **THE** system **SHALL** save the response with a `Pending` status for administrative review.

### 4.2. Administrator Moderation of Responses

-   **THE** system **SHALL** present all pending seller responses in the admin moderation queue.
-   **WHEN** an `admin` approves a seller's response, **THE** system **SHALL** change its status to `Approved` and make it visible directly beneath the customer's review.
-   **IF** an `admin` rejects a seller's response, **THEN THE** system **SHALL** change its status to `Rejected` and ensure it is not publicly displayed.

## 5. Public Display and Rating Calculation

Approved reviews and responses are displayed on the product detail page to inform potential buyers.

### 5.1. Average Rating Calculation

-   **THE** system **SHALL** calculate and display the average star rating for each product, derived from the sum of all `Approved` ratings divided by the total number of `Approved` reviews.
-   **WHEN** a new review is approved, **THE** system **SHALL** immediately recalculate and update the product's average rating.
-   **THE** system **SHALL** prominently display the average rating and the total count of reviews near the product title (e.g., "★★★★☆ (125 reviews)").
-   **WHILE** a product has no `Approved` reviews, **THE** system **SHALL** indicate that there are no reviews yet.

### 5.2. Displaying Reviews and Responses

-   **THE** system **SHALL** list all `Approved` reviews in a dedicated section on the product page.
-   Each review entry **SHALL** display the star rating, the customer's comment, the customer's display name, and the submission date.
-   **IF** an `Approved` seller response exists for a review, **THE** system **SHALL** display it nested directly under the corresponding customer review.
-   **THE** system **SHALL** paginate the list of reviews and provide sorting options (e.g., by Most Recent, Highest Rating, Lowest Rating).

## 6. System Interaction Flow

This diagram illustrates the interconnected workflows for customer reviews and seller responses, from submission to public display.

```mermaid
graph TD
    subgraph "Customer Review Cycle"
        A["Start: Customer submits review"] --> B["Save as 